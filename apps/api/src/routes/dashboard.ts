import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";

export async function dashboardRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/dashboard", async (req) => {
    const restaurantId = tenantId(req);
    const start = new Date(); start.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: start }, status: { not: "CANCELADO" } },
      include: { items: true },
    });

    const faturamento = todayOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const ticketMedio = todayOrders.length ? faturamento / todayOrders.length : 0;

    const countBy = (st: string) => todayOrders.filter((o: any) => o.status === st).length;

    // produtos mais vendidos hoje
    const tally = new Map<string, number>();
    for (const o of todayOrders)
      for (const it of o.items) tally.set(it.productName, (tally.get(it.productName) ?? 0) + it.quantity);
    const topProdutos = [...tally.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    return {
      pedidosDoDia: todayOrders.length,
      faturamento,
      ticketMedio,
      pendentes: countBy("NOVO") + countBy("CONFIRMANDO") + countBy("AGUARDANDO_PIX") + countBy("AGUARDANDO_VALIDACAO_HUMANA"),
      emPreparo: countBy("EM_PREPARO"),
      emEntrega: countBy("SAIU_PARA_ENTREGA"),
      topProdutos,
    };
  });
}
