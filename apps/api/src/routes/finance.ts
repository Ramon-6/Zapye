import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";

const money = (d: unknown) => Number(d ?? 0);

export async function financeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Receita de pedidos FINALIZADOS (o que "caiu no financeiro").
  app.get("/finance", async (req) => {
    const restaurantId = tenantId(req);
    const since = new Date(); since.setDate(since.getDate() - 30); since.setHours(0, 0, 0, 0);

    const finalized = await prisma.order.findMany({
      where: { restaurantId, status: "FINALIZADO", updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      include: { client: true },
    });

    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const today = finalized.filter((o: any) => o.updatedAt >= startToday);

    const sum = (arr: any[]) => arr.reduce((s, o) => s + money(o.total), 0);
    const revenueToday = sum(today);
    const revenue30 = sum(finalized);

    // série dos últimos 7 dias
    const byDay: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const total = sum(finalized.filter((o: any) => o.updatedAt >= d && o.updatedAt < next));
      byDay.push({ date: d.toISOString().slice(0, 10), total });
    }

    return {
      revenueToday, ordersToday: today.length,
      ticketToday: today.length ? revenueToday / today.length : 0,
      revenue30, orders30: finalized.length,
      byDay,
      recent: finalized.slice(0, 20).map((o: any) => ({
        code: o.code, client: o.client.name, total: money(o.total),
        paymentMethod: o.paymentMethod, date: o.updatedAt,
      })),
    };
  });
}
