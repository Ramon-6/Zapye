import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { sendWhatsappText } from "../lib/evolution.js";
import { runAgent } from "../ai/orchestrator.js";

// Normaliza o JID da Evolution para um telefone limpo.
function jidToPhone(jid: string) {
  return jid.replace(/@s\.whatsapp\.net$/, "").replace(/@c\.us$/, "").split(":")[0];
}

export const qrKey = (instance: string) => `wa:qr:${instance}`;

export async function webhookRoutes(app: FastifyInstance) {
  // Evolution API bate aqui a cada evento. instanceId vem no path (rota global
  // também funciona usando body.instance).
  app.post("/webhooks/evolution/:instanceId?", async (req, reply) => {
    const body = req.body as any;
    const event = body?.event;
    const instanceName = body?.instance ?? (req.params as any).instanceId;

    // ── QR Code: guarda no Redis (TTL 90s) para a tela buscar ──
    if (event === "qrcode.updated") {
      const b64 = body?.data?.qrcode?.base64 ?? body?.data?.base64;
      if (b64 && instanceName) await redis.set(qrKey(instanceName), b64, "EX", 90);
      return reply.send({ ok: true });
    }

    // ── Conexão mudou: atualiza flag e limpa QR quando parear ──
    if (event === "connection.update") {
      const state = body?.data?.state;
      if (instanceName && state) {
        await prisma.whatsappInstance.updateMany({
          where: { instanceName }, data: { connected: state === "open" },
        });
        if (state === "open") await redis.del(qrKey(instanceName));
      }
      return reply.send({ ok: true });
    }

    // Daqui pra baixo: só mensagem recebida de cliente.
    if (event !== "messages.upsert") return reply.send({ ok: true });
    const data = body.data;
    if (data?.key?.fromMe) return reply.send({ ok: true }); // mensagem nossa

    const waMessageId = data?.key?.id as string | undefined;
    const text =
      data?.message?.conversation ??
      data?.message?.extendedTextMessage?.text ??
      null;

    // 1. Identifica restaurante pela instância
    const instance = await prisma.whatsappInstance.findUnique({
      where: { instanceName }, include: { restaurant: { include: { settings: true } } },
    });
    if (!instance) return reply.send({ ok: true });
    const restaurant = instance.restaurant;

    // 2. Identifica/cria cliente
    const phone = jidToPhone(data.key.remoteJid);
    const pushName = data?.pushName as string | undefined;
    const client = await prisma.client.upsert({
      where: { restaurantId_phone: { restaurantId: restaurant.id, phone } },
      update: { name: pushName ?? undefined },
      create: { restaurantId: restaurant.id, phone, name: pushName },
    });

    // 3. Conversa
    const conversation = await prisma.conversation.upsert({
      where: { id: (await prisma.conversation.findFirst({
        where: { restaurantId: restaurant.id, clientId: client.id },
        orderBy: { createdAt: "desc" }, select: { id: true },
      }))?.id ?? "___none___" },
      update: { lastMessageAt: new Date(), instanceId: instance.id },
      create: { restaurantId: restaurant.id, clientId: client.id, instanceId: instance.id },
    }).catch(() =>
      prisma.conversation.create({
        data: { restaurantId: restaurant.id, clientId: client.id, instanceId: instance.id },
      }),
    );

    // 4. Salva mensagem recebida (idempotente por waMessageId)
    const isImage = !!data?.message?.imageMessage;
    await prisma.message.upsert({
      where: { waMessageId: waMessageId ?? `${conversation.id}-${Date.now()}` },
      update: {},
      create: {
        conversationId: conversation.id, direction: "INBOUND", sender: "CLIENT",
        content: text ?? (isImage ? "[imagem/comprovante]" : "[mídia]"),
        mediaType: isImage ? "image" : null, waMessageId,
      },
    });

    // 5. IA ativa? (config global + status da conversa)
    const aiOn = restaurant.settings?.aiEnabled && conversation.status === "BOT";
    if (!aiOn) return reply.send({ ok: true }); // humano cuida

    // 5b. Loja fechada: a IA não toma pedido, só avisa (1x por conversa via flag simples).
    if (!restaurant.settings?.isOpen) {
      const msg = restaurant.settings?.closingMessage
        ?? "No momento estamos fechados. 😴 Assim que abrirmos, será um prazer te atender!";
      await persistAndSend(conversation.id, instanceName, data.key.remoteJid, msg);
      return reply.send({ ok: true });
    }

    // Comprovante de pagamento: não deixa a IA "confirmar". Marca p/ validação.
    if (isImage && !text) {
      await prisma.payment.updateMany({
        where: { order: { clientId: client.id, restaurantId: restaurant.id }, status: "PENDENTE" },
        data: { status: "EM_VALIDACAO" },
      });
      const ack = "Recebi seu comprovante! 🙌 Já encaminhei para a equipe validar o pagamento. Em instantes confirmamos seu pedido.";
      await persistAndSend(conversation.id, instanceName, data.key.remoteJid, ack);
      return reply.send({ ok: true });
    }

    if (!text) return reply.send({ ok: true });

    // 6. Processa no orquestrador
    let answer: string;
    try {
      answer = await runAgent({
        ctx: { restaurantId: restaurant.id, clientId: client.id, conversationId: conversation.id },
        restaurantName: restaurant.name,
        extraTone: restaurant.settings?.aiTone,
        userText: text,
      });
    } catch (err) {
      req.log.error(err);
      answer = "Opa, tive um probleminha aqui. Já estou chamando um atendente pra te ajudar. 🙏";
      await prisma.conversation.update({ where: { id: conversation.id }, data: { status: "WAITING" } });
    }

    // 7+8. Salva resposta e envia pela Evolution
    await persistAndSend(conversation.id, instanceName, data.key.remoteJid, answer);
    return reply.send({ ok: true });
  });
}

async function persistAndSend(conversationId: string, instanceName: string, toJid: string, text: string) {
  await prisma.message.create({
    data: { conversationId, direction: "OUTBOUND", sender: "AI", content: text },
  });
  try {
    await sendWhatsappText(instanceName, toJid, text);
  } catch (err) {
    // log silencioso: a mensagem fica salva, podemos reenviar depois
    console.error("falha ao enviar WhatsApp:", (err as Error).message);
  }
}
