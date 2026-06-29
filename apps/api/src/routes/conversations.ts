import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";
import { sendWhatsappText } from "../lib/evolution.js";

export async function conversationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Lista de conversas (inbox).
  app.get("/conversations", async (req) =>
    prisma.conversation.findMany({
      where: { restaurantId: tenantId(req) },
      orderBy: { lastMessageAt: "desc" },
      include: { client: true, messages: { take: 1, orderBy: { createdAt: "desc" } } },
      take: 100,
    }),
  );

  app.get("/conversations/:id/messages", async (req, reply) => {
    const { id } = req.params as { id: string };
    const conv = await prisma.conversation.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!conv) return reply.code(404).send({ error: "conversa não encontrada" });
    return prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" } });
  });

  // Atendente assume → IA pausa.
  app.post("/conversations/:id/takeover", async (req) => {
    const { id } = req.params as { id: string };
    await prisma.aiSession.updateMany({ where: { conversationId: id, active: true }, data: { active: false } });
    return prisma.conversation.update({ where: { id }, data: { status: "HUMAN" } });
  });

  // Devolve para a IA.
  app.post("/conversations/:id/release", async (req) =>
    prisma.conversation.update({ where: { id: (req.params as any).id }, data: { status: "BOT" } }),
  );

  // Atendente envia mensagem manual.
  app.post("/conversations/:id/send", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);

    const conv = await prisma.conversation.findFirst({
      where: { id, restaurantId: tenantId(req) },
      include: { client: true, instance: true },
    });
    if (!conv || !conv.instance) return reply.code(404).send({ error: "conversa/instância não encontrada" });

    await prisma.message.create({
      data: { conversationId: id, direction: "OUTBOUND", sender: "HUMAN", content: text },
    });
    const jid = `${conv.client.phone}@s.whatsapp.net`;
    await sendWhatsappText(conv.instance.instanceName, jid, text);
    return { ok: true };
  });

  // Tags do cliente.
  app.patch("/clients/:id/tags", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { tags } = z.object({ tags: z.array(z.string()) }).parse(req.body);
    const owned = await prisma.client.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "cliente não encontrado" });
    return prisma.client.update({ where: { id }, data: { tags } });
  });
}
