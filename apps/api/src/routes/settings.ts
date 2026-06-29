import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard, tenantId } from "../lib/auth.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authGuard);

  // Dados da loja + settings (inclui isOpen).
  app.get("/settings", async (req) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: tenantId(req) },
      include: { settings: true },
    });
    return restaurant;
  });

  // Abrir/fechar a loja (botão na área de Pedidos).
  app.patch("/settings/store-status", async (req) => {
    const { open } = z.object({ open: z.boolean() }).parse(req.body);
    const restaurantId = tenantId(req);
    await prisma.restaurantSettings.upsert({
      where: { restaurantId },
      update: { isOpen: open },
      create: { restaurantId, isOpen: open },
    });
    return { isOpen: open };
  });

  // Atualiza campos gerais da loja (Pix, horários, mensagens, etc.).
  app.patch("/settings", async (req) => {
    const body = z.object({
      addressLine: z.string().optional(),
      pixKey: z.string().optional(),
      pixKeyName: z.string().optional(),
      avgDeliveryMin: z.number().optional(),
      minOrderValue: z.number().optional(),
      greetingMessage: z.string().optional(),
      closingMessage: z.string().optional(),
      deliveryPolicy: z.string().optional(),
      acceptsPix: z.boolean().optional(),
      acceptsCash: z.boolean().optional(),
      acceptsCard: z.boolean().optional(),
      acceptsPickup: z.boolean().optional(),
      aiEnabled: z.boolean().optional(),
      aiTone: z.string().optional(),
    }).parse(req.body);

    const restaurantId = tenantId(req);
    return prisma.restaurantSettings.upsert({
      where: { restaurantId },
      update: body,
      create: { restaurantId, ...body },
    });
  });
}
