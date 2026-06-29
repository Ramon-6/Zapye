import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";
import { todaySP } from "../lib/date.js";

export async function menuRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // ---- Categorias (com produtos + adicionais, para gestão) ----
  app.get("/menu/categories", async (req) =>
    prisma.menuCategory.findMany({
      where: { restaurantId: tenantId(req) },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: { addons: { orderBy: { id: "asc" } }, variations: true },
        },
      },
    }),
  );

  // Data de hoje (SP) — a UI usa p/ saber se o item diário está ativo hoje
  app.get("/menu/today", async () => ({ today: todaySP() }));

  app.post("/menu/categories", async (req) => {
    const body = z.object({ name: z.string().min(1), description: z.string().optional(), sortOrder: z.number().optional() }).parse(req.body);
    return prisma.menuCategory.create({ data: { ...body, restaurantId: tenantId(req) } });
  });

  // ---- Produtos ----
  app.post("/menu/products", async (req) => {
    const body = z.object({
      categoryId: z.string(), name: z.string().min(1), description: z.string().optional(),
      ingredients: z.string().optional(), basePrice: z.number(), imageUrl: z.string().optional(),
      isCombo: z.boolean().optional(),
    }).parse(req.body);
    return prisma.product.create({ data: { ...body, restaurantId: tenantId(req) } });
  });

  app.patch("/menu/products/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.product.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "produto não encontrado" });

    const body = z.object({
      name: z.string().optional(), description: z.string().optional(), ingredients: z.string().optional(),
      basePrice: z.number().optional(), active: z.boolean().optional(), imageUrl: z.string().optional(),
      categoryId: z.string().optional(), isDaily: z.boolean().optional(),
      availableDate: z.string().nullable().optional(),
    }).parse(req.body);
    return prisma.product.update({ where: { id }, data: body });
  });

  // ---- Cardápio do dia ----
  // Marca um produto como disponível hoje (e ativo).
  app.post("/menu/products/:id/available-today", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.product.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "produto não encontrado" });
    return prisma.product.update({ where: { id }, data: { availableDate: todaySP(), active: true } });
  });

  // Ativa TODOS os itens diários para hoje (botão "Ativar cardápio do dia").
  app.post("/menu/day/activate-all", async (req) => {
    const res = await prisma.product.updateMany({
      where: { restaurantId: tenantId(req), isDaily: true },
      data: { availableDate: todaySP() },
    });
    return { activated: res.count, today: todaySP() };
  });

  // Limpa o cardápio do dia (itens diários deixam de aparecer).
  app.post("/menu/day/clear", async (req) => {
    const res = await prisma.product.updateMany({
      where: { restaurantId: tenantId(req), isDaily: true },
      data: { availableDate: null },
    });
    return { cleared: res.count };
  });

  // Remove adicional.
  app.delete("/menu/addons/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.productAddon.findFirst({ where: { id, product: { restaurantId: tenantId(req) } } });
    if (!owned) return reply.code(404).send({ error: "adicional não encontrado" });
    await prisma.productAddon.delete({ where: { id } });
    return { ok: true };
  });

  // ---- Adicionais ----
  app.post("/menu/products/:id/addons", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.product.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "produto não encontrado" });

    const body = z.object({
      name: z.string().min(1), price: z.number().default(0),
      type: z.enum(["EXTRA", "OPTION"]).default("EXTRA"), required: z.boolean().optional(), maxQty: z.number().optional(),
    }).parse(req.body);
    return prisma.productAddon.create({ data: { ...body, productId: id } });
  });
}
