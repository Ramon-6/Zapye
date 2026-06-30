import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";
import { todaySP } from "../lib/date.js";

export async function menuRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

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

  app.get("/menu/today", async () => ({ today: todaySP() }));

  app.post("/menu/categories", async (req) => {
    const body = z.object({ name: z.string().min(1), description: z.string().optional(), sortOrder: z.number().optional() }).parse(req.body);
    return prisma.menuCategory.create({ data: { ...body, restaurantId: tenantId(req) } });
  });

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
    if (!owned) return reply.code(404).send({ error: "produto nao encontrado" });

    const body = z.object({
      name: z.string().optional(), description: z.string().optional(), ingredients: z.string().optional(),
      basePrice: z.number().optional(), active: z.boolean().optional(), imageUrl: z.string().optional(),
      categoryId: z.string().optional(), isDaily: z.boolean().optional(),
      availableDate: z.string().nullable().optional(),
    }).parse(req.body);
    return prisma.product.update({ where: { id }, data: body });
  });

  app.delete("/menu/products/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.product.findFirst({
      where: { id, restaurantId: tenantId(req) },
      include: { cartItems: { take: 1 } },
    });
    if (!owned) return reply.code(404).send({ error: "produto nao encontrado" });
    if (owned.cartItems.length > 0) {
      await prisma.product.update({ where: { id }, data: { active: false } });
      return { ok: true, archived: true };
    }
    await prisma.product.delete({ where: { id } });
    return { ok: true, deleted: true };
  });

  app.post("/menu/products/:id/available-today", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.product.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "produto nao encontrado" });
    return prisma.product.update({ where: { id }, data: { availableDate: todaySP(), active: true } });
  });

  app.post("/menu/day/activate-all", async (req) => {
    const res = await prisma.product.updateMany({
      where: { restaurantId: tenantId(req), isDaily: true },
      data: { availableDate: todaySP() },
    });
    return { activated: res.count, today: todaySP() };
  });

  app.post("/menu/day/clear", async (req) => {
    const res = await prisma.product.updateMany({
      where: { restaurantId: tenantId(req), isDaily: true },
      data: { availableDate: null },
    });
    return { cleared: res.count };
  });

  app.delete("/menu/addons/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.productAddon.findFirst({ where: { id, product: { restaurantId: tenantId(req) } } });
    if (!owned) return reply.code(404).send({ error: "adicional nao encontrado" });
    await prisma.productAddon.delete({ where: { id } });
    return { ok: true };
  });

  app.post("/menu/products/:id/addons", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.product.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "produto nao encontrado" });

    const body = z.object({
      name: z.string().min(1), price: z.number().default(0),
      type: z.enum(["EXTRA", "OPTION"]).default("EXTRA"), required: z.boolean().optional(), maxQty: z.number().optional(),
    }).parse(req.body);
    return prisma.productAddon.create({ data: { ...body, productId: id } });
  });
}
