import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { authGuard, tenantId } from "../lib/auth.js";
import { qrKey } from "./webhooks.js";
import {
  createInstance, connectInstance, getConnectionState, logoutInstance, setInstanceWebhook,
} from "../lib/evolution.js";

// Nome da instância na Evolution, derivado do slug da loja.
async function instanceNameFor(restaurantId: string) {
  const r = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  return `zapye-${r?.slug ?? restaurantId}`;
}

// Normaliza state da Evolution → connected boolean.
const isOpen = (raw: any) => (raw?.instance?.state ?? raw?.state) === "open";

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Estado atual da conexão da loja.
  app.get("/settings/whatsapp", async (req) => {
    const restaurantId = tenantId(req);
    const instanceName = await instanceNameFor(restaurantId);
    const record = await prisma.whatsappInstance.findUnique({ where: { instanceName } });

    let state = "close";
    try {
      const raw = await getConnectionState(instanceName);
      state = raw?.instance?.state ?? raw?.state ?? "close";
    } catch { /* instância ainda não existe */ }

    if (record && isOpen({ state }) !== record.connected) {
      await prisma.whatsappInstance.update({ where: { instanceName }, data: { connected: isOpen({ state }) } });
    }
    return { instanceName, registered: !!record, connected: state === "open", state };
  });

  // Inicia o pareamento. O QR chega de forma assíncrona via webhook → Redis;
  // a tela busca em GET /settings/whatsapp/qr.
  app.post("/settings/whatsapp/connect", async (req) => {
    const restaurantId = tenantId(req);
    const instanceName = await instanceNameFor(restaurantId);

    // garante o registro no banco (o webhook usa p/ achar a loja)
    await prisma.whatsappInstance.upsert({
      where: { instanceName },
      update: { restaurantId },
      create: { instanceName, restaurantId },
    });

    await createInstance(instanceName);       // idempotente
    await setInstanceWebhook(instanceName);   // garante eventos (QR/msgs) na nossa API
    try { await connectInstance(instanceName); } catch { /* já conectando */ }

    return { ok: true, instanceName };
  });

  // QR atual (vindo do webhook). data:image/png;base64,...
  app.get("/settings/whatsapp/qr", async (req) => {
    const instanceName = await instanceNameFor(tenantId(req));
    const b64 = await redis.get(qrKey(instanceName));
    const qr = b64 ? (b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`) : null;
    return { qr };
  });

  // Desconecta o número (mantém a instância).
  app.post("/settings/whatsapp/disconnect", async (req) => {
    const instanceName = await instanceNameFor(tenantId(req));
    try { await logoutInstance(instanceName); } catch { /* já desconectado */ }
    await prisma.whatsappInstance.updateMany({ where: { instanceName }, data: { connected: false } });
    return { ok: true };
  });
}
