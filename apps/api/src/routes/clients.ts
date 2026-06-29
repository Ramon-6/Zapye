import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";

const money = (d: unknown) => Number(d ?? 0);

export async function clientRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Lista de clientes com nº de pedidos e total gasto (CRM básico).
  app.get("/clients", async (req) => {
    const clients = await prisma.client.findMany({
      where: { restaurantId: tenantId(req) },
      orderBy: { createdAt: "desc" },
      include: { orders: { select: { total: true, status: true } } },
      take: 300,
    });
    return clients.map((c: any) => {
      const paid = c.orders.filter((o: any) => o.status !== "CANCELADO");
      return {
        id: c.id, name: c.name, phone: c.phone, tags: c.tags,
        ordersCount: paid.length,
        totalSpent: paid.reduce((s: number, o: any) => s + money(o.total), 0),
      };
    });
  });
}
