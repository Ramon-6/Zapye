import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";

export async function deliveryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  app.get("/delivery-zones", async (req) =>
    prisma.deliveryZone.findMany({
      where: { restaurantId: tenantId(req) },
      orderBy: { neighborhood: "asc" },
    }),
  );

  app.post("/delivery-zones", async (req, reply) => {
    const body = z.object({
      neighborhood: z.string().min(1),
      fee: z.number().min(0),
      minOrder: z.number().min(0).optional(),
      avgMinutes: z.number().int().optional(),
    }).parse(req.body);
    try {
      return await prisma.deliveryZone.create({ data: { ...body, restaurantId: tenantId(req) } });
    } catch (err: any) {
      if (err?.code === "P2002") return reply.code(409).send({ error: "Esse bairro já está cadastrado" });
      throw err;
    }
  });

  app.patch("/delivery-zones/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.deliveryZone.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "bairro não encontrado" });

    const body = z.object({
      neighborhood: z.string().optional(),
      fee: z.number().min(0).optional(),
      minOrder: z.number().min(0).optional(),
      avgMinutes: z.number().int().optional(),
      active: z.boolean().optional(),
    }).parse(req.body);
    return prisma.deliveryZone.update({ where: { id }, data: body });
  });

  app.delete("/delivery-zones/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const owned = await prisma.deliveryZone.findFirst({ where: { id, restaurantId: tenantId(req) } });
    if (!owned) return reply.code(404).send({ error: "bairro não encontrado" });
    await prisma.deliveryZone.delete({ where: { id } });
    return { ok: true };
  });
}
