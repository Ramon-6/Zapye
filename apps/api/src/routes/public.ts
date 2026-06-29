import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { createPix } from "../lib/mercadopago.js";
import { notifyOrderStatus } from "../lib/notify.js";
import { todaySP } from "../lib/date.js";

// Item aparece se: ativo E (não é diário OU está marcado para hoje).
const offeredWhere = () => ({ active: true, OR: [{ isDaily: false }, { availableDate: todaySP() }] });

const money = (d: unknown) => Number(d ?? 0);

async function findPublicRestaurant(slug: string, includeSettings = false): Promise<any | null> {
  const include = includeSettings ? { settings: true } : undefined;
  const exact = await prisma.restaurant.findUnique({ where: { slug }, include });
  if (exact) return exact;

  const activeRestaurants = await prisma.restaurant.findMany({
    where: { active: true },
    include,
    orderBy: { createdAt: "asc" },
    take: 2,
  });
  return activeRestaurants.length === 1 ? activeRestaurants[0] : null;
}

// Rotas PÚBLICAS (sem auth) usadas pelo cardápio digital que o cliente abre.
export async function publicRoutes(app: FastifyInstance) {
  // Info da loja
  app.get("/public/r/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const r = await findPublicRestaurant(slug, true);
    if (!r) return reply.code(404).send({ error: "loja não encontrada" });
    const s = r.settings;
    return {
      name: r.name, slug: r.slug, isOpen: s?.isOpen ?? false,
      minOrderValue: money(s?.minOrderValue), avgDeliveryMin: s?.avgDeliveryMin ?? 40,
      accepts: { pix: s?.acceptsPix, cash: s?.acceptsCash, card: s?.acceptsCard, pickup: s?.acceptsPickup },
    };
  });

  // Cardápio (categorias → produtos → variações/adicionais)
  app.get("/public/r/:slug/menu", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const r = await findPublicRestaurant(slug);
    if (!r) return reply.code(404).send({ error: "loja não encontrada" });
    const cats = await prisma.menuCategory.findMany({
      where: { restaurantId: r.id, active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        products: {
          where: offeredWhere(), orderBy: { sortOrder: "asc" },
          include: { addons: { where: { active: true } }, variations: { where: { active: true } } },
        },
      },
    });
    return cats.filter((c: any) => c.products.length > 0).map((c: any) => ({
      id: c.id, name: c.name,
      products: c.products.map((p: any) => ({
        id: p.id, name: p.name, description: p.description, price: money(p.basePrice), imageUrl: p.imageUrl,
        addons: p.addons.map((a: any) => ({ id: a.id, name: a.name, price: money(a.price) })),
        variations: p.variations.map((v: any) => ({ id: v.id, name: v.name, price: money(v.price) })),
      })),
    }));
  });

  // Bairros atendidos
  app.get("/public/r/:slug/zones", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const r = await findPublicRestaurant(slug);
    if (!r) return reply.code(404).send({ error: "loja não encontrada" });
    const zones = await prisma.deliveryZone.findMany({
      where: { restaurantId: r.id, active: true }, orderBy: { neighborhood: "asc" },
    });
    return zones.map((z: any) => ({ id: z.id, neighborhood: z.neighborhood, fee: money(z.fee), minOrder: money(z.minOrder) }));
  });

  // Sessão do link (prefill nome/telefone vindo do WhatsApp)
  app.get("/public/session/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const raw = await redis.get(`menu:token:${token}`);
    if (!raw) return reply.code(404).send({ error: "link expirado" });
    const { clientId } = JSON.parse(raw);
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    return { client: client ? { name: client.name, phone: client.phone } : null };
  });

  // Cria o pedido
  app.post("/public/r/:slug/order", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const body = z.object({
      token: z.string().optional(),
      customerName: z.string().min(1),
      customerPhone: z.string().min(8),
      items: z.array(z.object({
        productId: z.string(), variationId: z.string().optional(),
        addonIds: z.array(z.string()).default([]), quantity: z.number().int().min(1), notes: z.string().optional(),
      })).min(1),
      deliveryType: z.enum(["RETIRADA", "ENTREGA"]),
      neighborhood: z.string().optional(),
      street: z.string().optional(), number: z.string().optional(),
      complement: z.string().optional(), reference: z.string().optional(),
      paymentMethod: z.enum(["PIX", "DINHEIRO", "CARTAO"]),
      changeFor: z.number().optional(),
    }).parse(req.body);

    const r = await findPublicRestaurant(slug, true);
    if (!r) return reply.code(404).send({ error: "loja não encontrada" });
    if (!r.settings?.isOpen) return reply.code(409).send({ error: "A loja está fechada no momento." });

    // cliente: do token (vínculo WhatsApp) ou upsert por telefone
    let clientId: string;
    if (body.token) {
      const raw = await redis.get(`menu:token:${body.token}`);
      clientId = raw ? JSON.parse(raw).clientId : "";
    }
    const phone = body.customerPhone.replace(/\D/g, "");
    const client = await prisma.client.upsert({
      where: { restaurantId_phone: { restaurantId: r.id, phone } },
      update: { name: body.customerName },
      create: { restaurantId: r.id, phone, name: body.customerName },
    });
    clientId = client.id;

    // recalcula preços a partir do banco (nunca confia no cliente)
    const products = await prisma.product.findMany({
      where: { id: { in: body.items.map((i) => i.productId) }, restaurantId: r.id, active: true },
      include: { addons: true, variations: true },
    });
    const pmap = new Map(products.map((p: any) => [p.id, p]));

    const orderItems = body.items.map((it) => {
      const p: any = pmap.get(it.productId);
      if (!p) throw new Error("produto inválido");
      let unit = money(p.basePrice);
      let variationName: string | undefined;
      if (it.variationId) {
        const v = p.variations.find((x: any) => x.id === it.variationId && x.active);
        if (v) { unit = money(v.price); variationName = v.name; }
      }
      const chosen = p.addons.filter((a: any) => it.addonIds.includes(a.id) && a.active);
      const addonsSnap = chosen.map((a: any) => ({ addonId: a.id, name: a.name, price: money(a.price), qty: 1 }));
      unit += addonsSnap.reduce((s: number, a: any) => s + a.price, 0);
      return {
        productId: p.id, productName: p.name, variationName, quantity: it.quantity,
        addons: addonsSnap, notes: it.notes ?? null, unitPrice: unit, lineTotal: unit * it.quantity,
      };
    });

    const subtotal = orderItems.reduce((s, i) => s + i.lineTotal, 0);

    // entrega
    let deliveryFee = 0;
    let addressId: string | null = null;
    if (body.deliveryType === "ENTREGA") {
      if (!body.neighborhood || !body.street) return reply.code(400).send({ error: "endereço incompleto" });
      const zone = await prisma.deliveryZone.findFirst({
        where: { restaurantId: r.id, active: true, neighborhood: { equals: body.neighborhood, mode: "insensitive" } },
      });
      if (!zone) return reply.code(409).send({ error: "Bairro não atendido." });
      if (subtotal < money(zone.minOrder)) return reply.code(409).send({ error: `Pedido mínimo para ${zone.neighborhood}: R$ ${money(zone.minOrder).toFixed(2)}` });
      deliveryFee = money(zone.fee);
      const addr = await prisma.address.create({
        data: { clientId, street: body.street, number: body.number, complement: body.complement, neighborhood: zone.neighborhood, reference: body.reference },
      });
      addressId = addr.id;
    }

    const total = subtotal + deliveryFee;
    if (subtotal < money(r.settings?.minOrderValue)) {
      return reply.code(409).send({ error: `Pedido mínimo: R$ ${money(r.settings?.minOrderValue).toFixed(2)}` });
    }

    // troco
    let deliveryNote: string | null = null;
    if (body.paymentMethod === "DINHEIRO" && body.changeFor) deliveryNote = `Troco para R$ ${body.changeFor.toFixed(2)}`;

    const last = await prisma.order.findFirst({ where: { restaurantId: r.id }, orderBy: { code: "desc" }, select: { code: true } });
    const code = (last?.code ?? 0) + 1;

    // pagar agora (PIX) → aguardando pix | pagar na entrega/retirada → entra como NOVO
    const payNow = body.paymentMethod === "PIX";
    const order = await prisma.order.create({
      data: {
        restaurantId: r.id, clientId, code,
        status: payNow ? "AGUARDANDO_PIX" : "NOVO",
        deliveryType: body.deliveryType, addressId, deliveryNote, deliveryFee,
        paymentMethod: body.paymentMethod, subtotal, total,
        items: { create: orderItems },
        payments: { create: { method: body.paymentMethod, amount: total, status: "PENDENTE" } },
      },
    });

    let pix = null;
    if (payNow) {
      const charge = createPix(total, order.id);
      await redis.set(`pix:order:${order.id}`, JSON.stringify(charge), "EX", 3600);
      pix = { code: charge.code, amount: total, provider: charge.provider };
    } else {
      notifyOrderStatus(order.id, "CONFIRMANDO").catch(() => {});
    }

    return { orderId: order.id, code, subtotal, deliveryFee, total, status: order.status, pix };
  });

  // Status do pedido (a tela faz polling após o Pix)
  app.get("/public/order/:id/status", async (req) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id }, include: { payments: true } });
    return { status: order?.status, paid: order?.payments.some((p: any) => p.status === "CONFIRMADO") ?? false };
  });

  // VIRTUAL: simula a confirmação do Pix (imita o webhook do Mercado Pago)
  app.post("/public/order/:id/simulate-payment", async (req, reply) => {
    const { id } = req.params as { id: string };
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return reply.code(404).send({ error: "pedido não encontrado" });
    await prisma.payment.updateMany({ where: { orderId: id }, data: { status: "CONFIRMADO", validatedAt: new Date() } });
    await prisma.order.update({ where: { id }, data: { status: "PAGO" } });
    await redis.del(`pix:order:${id}`);
    notifyOrderStatus(id, "PAGO").catch(() => {});
    return { ok: true, status: "PAGO" };
  });
}
