import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";
import { notifyOrderStatus } from "../lib/notify.js";

const STATUSES = [
  "NOVO", "CONFIRMANDO", "AGUARDANDO_PIX", "AGUARDANDO_VALIDACAO_HUMANA",
  "PAGO", "EM_PREPARO", "PRONTO", "SAIU_PARA_ENTREGA", "FINALIZADO", "CANCELADO",
] as const;

export async function orderRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Lista pedidos (para o Kanban). Filtro opcional por status e data.
  app.get("/orders", async (req) => {
    const q = z.object({ status: z.enum(STATUSES).optional(), today: z.coerce.boolean().optional() })
      .parse(req.query);

    const where: any = { restaurantId: tenantId(req) };
    if (q.status) where.status = q.status;
    if (q.today) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      where.createdAt = { gte: start };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { client: true, items: true, address: true },
      take: 200,
    });
    return orders;
  });

  app.get("/orders/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findFirst({
      where: { id, restaurantId: tenantId(req) },
      include: { client: true, items: true, address: true, payments: true },
    });
    if (!order) return reply.code(404).send({ error: "pedido não encontrado" });
    return order;
  });

  // Mudança de status (botões do Kanban / cozinha).
  app.patch("/orders/:id/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status } = z.object({ status: z.enum(STATUSES) }).parse(req.body);

    const existing = await prisma.order.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!existing) return reply.code(404).send({ error: "pedido não encontrado" });

    const order = await prisma.order.update({ where: { id }, data: { status } });
    await prisma.auditLog.create({
      data: {
        restaurantId: tenantId(req), userId: req.user.sub, action: "ORDER_STATUS_CHANGED",
        entity: "Order", entityId: id, metadata: { from: existing.status, to: status },
      },
    });
    // avisa o cliente no WhatsApp sobre o avanço (não bloqueia a resposta)
    notifyOrderStatus(id, status).catch(() => {});
    return order;
  });

  // Validação manual de pagamento (a IA nunca faz isso).
  app.post("/orders/:id/confirm-payment", async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!order) return reply.code(404).send({ error: "pedido não encontrado" });

    await prisma.payment.updateMany({
      where: { orderId: id }, data: { status: "CONFIRMADO", validatedBy: req.user.sub, validatedAt: new Date() },
    });
    return prisma.order.update({ where: { id }, data: { status: "PAGO" } });
  });
}
