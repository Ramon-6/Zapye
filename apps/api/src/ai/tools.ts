import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { env } from "../config/env.js";
import { todaySP } from "../lib/date.js";

// Item oferecido: ativo E (não diário OU marcado para hoje).
const offered = () => ({ active: true, OR: [{ isDaily: false }, { availableDate: todaySP() }] });

// Contexto injetado a cada turno — a IA NUNCA escolhe o restaurante/cliente.
// Isso garante isolamento multi-tenant e impede vazamento entre lojas.
export type ToolContext = {
  restaurantId: string;
  clientId: string;
  conversationId: string;
};

// Prisma.Decimal | number | null → number
const money = (d: unknown) => Number(d ?? 0);

// ──────────────── Definições expostas ao modelo (JSON Schema) ────────────────
// Formato neutro; o orquestrador adapta para OpenAI ou Anthropic.
export const toolDefinitions = [
  { name: "get_restaurant_info", description: "Dados do restaurante: horário, endereço, formas de pagamento, tempo médio, política de entrega.", parameters: { type: "object", properties: {} } },
  { name: "get_menu_categories", description: "Lista as categorias ativas do cardápio.", parameters: { type: "object", properties: {} } },
  { name: "get_products_by_category", description: "Produtos ativos de uma categoria.", parameters: { type: "object", properties: { category_id: { type: "string" } }, required: ["category_id"] } },
  { name: "search_products", description: "Busca produtos por nome/ingrediente.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "get_product_details", description: "Detalhes de um produto, com variações.", parameters: { type: "object", properties: { product_id: { type: "string" } }, required: ["product_id"] } },
  { name: "get_product_addons", description: "Adicionais/opções de um produto.", parameters: { type: "object", properties: { product_id: { type: "string" } }, required: ["product_id"] } },
  { name: "create_cart", description: "Cria (ou reaproveita) o carrinho aberto do cliente.", parameters: { type: "object", properties: {} } },
  { name: "add_item_to_cart", description: "Adiciona item ao carrinho.", parameters: { type: "object", properties: { cart_id: { type: "string" }, product_id: { type: "string" }, quantity: { type: "number" }, variation_id: { type: "string" }, addon_ids: { type: "array", items: { type: "string" } }, notes: { type: "string" } }, required: ["cart_id", "product_id", "quantity"] } },
  { name: "update_cart_item", description: "Atualiza quantidade/adicionais/observação de um item.", parameters: { type: "object", properties: { cart_item_id: { type: "string" }, quantity: { type: "number" }, addon_ids: { type: "array", items: { type: "string" } }, notes: { type: "string" } }, required: ["cart_item_id"] } },
  { name: "remove_cart_item", description: "Remove um item do carrinho.", parameters: { type: "object", properties: { cart_item_id: { type: "string" } }, required: ["cart_item_id"] } },
  { name: "calculate_delivery_fee", description: "Calcula a taxa de entrega por bairro. Retorna não atendido se o bairro não existir.", parameters: { type: "object", properties: { neighborhood: { type: "string" } }, required: ["neighborhood"] } },
  { name: "get_cart_summary", description: "Resumo do carrinho com subtotal.", parameters: { type: "object", properties: { cart_id: { type: "string" } }, required: ["cart_id"] } },
  { name: "create_order", description: "Cria o pedido a partir do carrinho. Só chame após confirmação explícita do cliente.", parameters: { type: "object", properties: { cart_id: { type: "string" }, delivery_type: { type: "string", enum: ["RETIRADA", "ENTREGA"] }, payment_method: { type: "string", enum: ["PIX", "DINHEIRO", "CARTAO"] }, neighborhood: { type: "string" }, street: { type: "string" }, number: { type: "string" }, complement: { type: "string" }, reference: { type: "string" }, delivery_note: { type: "string" } }, required: ["cart_id", "delivery_type", "payment_method"] } },
  { name: "send_pix_info", description: "Retorna a chave Pix e o valor a pagar do pedido.", parameters: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] } },
  { name: "request_human_support", description: "Transfere a conversa para um atendente humano.", parameters: { type: "object", properties: { reason: { type: "string" } } } },
  { name: "send_menu_link", description: "Gera o link do cardápio digital vinculado a este cliente para ele montar o pedido na web. Use quando o cliente quiser ver o cardápio ou fazer um pedido.", parameters: { type: "object", properties: {} } },
] as const;

// ──────────────────────────── Implementações ────────────────────────────
type Handler = (ctx: ToolContext, args: any) => Promise<unknown>;

export const toolHandlers: Record<string, Handler> = {
  async get_restaurant_info(ctx) {
    const r = await prisma.restaurant.findUnique({
      where: { id: ctx.restaurantId },
      include: { settings: true, deliveryZones: { where: { active: true } } },
    });
    if (!r) return { error: "restaurante não encontrado" };
    const s = r.settings;
    return {
      name: r.name,
      address: s?.addressLine,
      opening_hours: s?.openingHours,
      avg_delivery_min: s?.avgDeliveryMin,
      min_order_value: money(s?.minOrderValue ?? 0),
      accepts: { pix: s?.acceptsPix, cash: s?.acceptsCash, card: s?.acceptsCard, pickup: s?.acceptsPickup },
      delivery_policy: s?.deliveryPolicy,
      neighborhoods: r.deliveryZones.map((z: any) => ({ name: z.neighborhood, fee: money(z.fee) })),
    };
  },

  async get_menu_categories(ctx) {
    const cats = await prisma.menuCategory.findMany({
      where: { restaurantId: ctx.restaurantId, active: true },
      orderBy: { sortOrder: "asc" },
    });
    return cats.map((c: any) => ({ id: c.id, name: c.name, description: c.description }));
  },

  async get_products_by_category(ctx, { category_id }) {
    const products = await prisma.product.findMany({
      where: { restaurantId: ctx.restaurantId, categoryId: category_id, ...offered() },
      orderBy: { sortOrder: "asc" },
    });
    return products.map((p: any) => ({ id: p.id, name: p.name, description: p.description, price: money(p.basePrice) }));
  },

  async search_products(ctx, { query }) {
    const products = await prisma.product.findMany({
      where: {
        restaurantId: ctx.restaurantId,
        ...offered(),
        AND: [{ OR: [
          { name: { contains: query, mode: "insensitive" } },
          { ingredients: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ] }],
      },
      take: 10,
    });
    return products.map((p: any) => ({ id: p.id, name: p.name, price: money(p.basePrice) }));
  },

  async get_product_details(ctx, { product_id }) {
    const p = await prisma.product.findFirst({
      where: { id: product_id, restaurantId: ctx.restaurantId, active: true },
      include: { variations: { where: { active: true } }, category: true },
    });
    if (!p) return { error: "produto não encontrado" };
    return {
      id: p.id, name: p.name, description: p.description, ingredients: p.ingredients,
      price: money(p.basePrice), category: p.category.name, allow_notes: p.allowNotes,
      variations: p.variations.map((v: any) => ({ id: v.id, name: v.name, price: money(v.price) })),
    };
  },

  async get_product_addons(ctx, { product_id }) {
    const addons = await prisma.productAddon.findMany({
      where: { productId: product_id, active: true, product: { restaurantId: ctx.restaurantId } },
    });
    return addons.map((a: any) => ({ id: a.id, name: a.name, type: a.type, price: money(a.price), required: a.required, max_qty: a.maxQty }));
  },

  async create_cart(ctx) {
    const existing = await prisma.cart.findFirst({
      where: { restaurantId: ctx.restaurantId, clientId: ctx.clientId, status: "OPEN" },
    });
    if (existing) return { cart_id: existing.id };
    const cart = await prisma.cart.create({
      data: { restaurantId: ctx.restaurantId, clientId: ctx.clientId },
    });
    return { cart_id: cart.id };
  },

  async add_item_to_cart(ctx, { cart_id, product_id, quantity, variation_id, addon_ids = [], notes }) {
    const product = await prisma.product.findFirst({
      where: { id: product_id, restaurantId: ctx.restaurantId, active: true },
      include: { variations: true, addons: true },
    });
    if (!product) return { error: "produto não encontrado" };

    let unit = money(product.basePrice);
    let variationName: string | undefined;
    if (variation_id) {
      const v = product.variations.find((x: any) => x.id === variation_id && x.active);
      if (!v) return { error: "variação inválida" };
      unit = money(v.price);
      variationName = v.name;
    }
    const chosen = product.addons.filter((a: any) => addon_ids.includes(a.id) && a.active);
    const addonsSnap = chosen.map((a: any) => ({ addonId: a.id, name: a.name, price: money(a.price), qty: 1 }));
    unit += addonsSnap.reduce((s: number, a: any) => s + a.price, 0);
    const lineTotal = unit * quantity;

    const item = await prisma.cartItem.create({
      data: {
        cartId: cart_id, productId: product_id, variationId: variation_id ?? null,
        quantity, addons: addonsSnap, notes: notes ?? null,
        unitPrice: unit, lineTotal,
      },
    });
    return { cart_item_id: item.id, line_total: lineTotal, variation: variationName, addons: addonsSnap };
  },

  async update_cart_item(_ctx, { cart_item_id, quantity, notes }) {
    const item = await prisma.cartItem.findUnique({ where: { id: cart_item_id } });
    if (!item) return { error: "item não encontrado" };
    const qty = quantity ?? item.quantity;
    const lineTotal = money(item.unitPrice) * qty;
    await prisma.cartItem.update({
      where: { id: cart_item_id },
      data: { quantity: qty, notes: notes ?? item.notes, lineTotal },
    });
    return { ok: true, line_total: lineTotal };
  },

  async remove_cart_item(_ctx, { cart_item_id }) {
    await prisma.cartItem.delete({ where: { id: cart_item_id } });
    return { ok: true };
  },

  async calculate_delivery_fee(ctx, { neighborhood }) {
    const zone = await prisma.deliveryZone.findFirst({
      where: { restaurantId: ctx.restaurantId, active: true, neighborhood: { equals: neighborhood, mode: "insensitive" } },
    });
    if (!zone) return { served: false, message: "bairro não atendido" };
    return { served: true, neighborhood: zone.neighborhood, fee: money(zone.fee), min_order: money(zone.minOrder), avg_minutes: zone.avgMinutes };
  },

  async get_cart_summary(_ctx, { cart_id }) {
    const cart = await prisma.cart.findUnique({
      where: { id: cart_id },
      include: { items: { include: { product: true } } },
    });
    if (!cart) return { error: "carrinho não encontrado" };
    const items = cart.items.map((i: any) => ({
      cart_item_id: i.id, product: i.product.name, quantity: i.quantity,
      addons: i.addons, notes: i.notes, line_total: money(i.lineTotal),
    }));
    const subtotal = items.reduce((s: number, i: any) => s + i.line_total, 0);
    return { cart_id, items, subtotal };
  },

  async create_order(ctx, args) {
    const { cart_id, delivery_type, payment_method, neighborhood, street, number, complement, reference, delivery_note } = args;
    const cart = await prisma.cart.findUnique({ where: { id: cart_id }, include: { items: { include: { product: true } } } });
    if (!cart || cart.items.length === 0) return { error: "carrinho vazio" };

    let deliveryFee = 0;
    let addressId: string | null = null;
    if (delivery_type === "ENTREGA") {
      if (!neighborhood || !street) return { error: "endereço incompleto" };
      const zone = await prisma.deliveryZone.findFirst({
        where: { restaurantId: ctx.restaurantId, active: true, neighborhood: { equals: neighborhood, mode: "insensitive" } },
      });
      if (!zone) return { error: "bairro não atendido" };
      deliveryFee = money(zone.fee);
      const addr = await prisma.address.create({
        data: { clientId: ctx.clientId, street, number, complement, neighborhood: zone.neighborhood, reference },
      });
      addressId = addr.id;
    }

    const subtotal = cart.items.reduce((s: number, i: any) => s + money(i.lineTotal), 0);
    const total = subtotal + deliveryFee;

    // número sequencial por restaurante
    const last = await prisma.order.findFirst({
      where: { restaurantId: ctx.restaurantId }, orderBy: { code: "desc" }, select: { code: true },
    });
    const code = (last?.code ?? 0) + 1;

    const order = await prisma.order.create({
      data: {
        restaurantId: ctx.restaurantId, clientId: ctx.clientId, cartId: cart.id, code,
        status: payment_method === "PIX" ? "AGUARDANDO_PIX" : "CONFIRMANDO",
        deliveryType: delivery_type, addressId, deliveryNote: delivery_note ?? null,
        deliveryFee, paymentMethod: payment_method, subtotal, total,
        items: {
          create: cart.items.map((i: any) => ({
            productId: i.productId, productName: i.product.name, quantity: i.quantity,
            addons: i.addons as any, notes: i.notes, unitPrice: i.unitPrice, lineTotal: i.lineTotal,
          })),
        },
        payments: { create: { method: payment_method, amount: total, status: "PENDENTE" } },
      },
    });
    await prisma.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });

    return { order_id: order.id, code: order.code, subtotal, delivery_fee: deliveryFee, total, status: order.status };
  },

  async send_pix_info(ctx, { order_id }) {
    const order = await prisma.order.findFirst({
      where: { id: order_id, restaurantId: ctx.restaurantId },
      include: { restaurant: { include: { settings: true } } },
    });
    if (!order) return { error: "pedido não encontrado" };
    const s = order.restaurant.settings;
    if (!s?.pixKey) return { error: "Pix não configurado" };
    return { pix_key: s.pixKey, pix_name: s.pixKeyName, amount: money(order.total), note: "Pagamento será validado pela equipe após o envio do comprovante." };
  },

  async send_menu_link(ctx) {
    const r = await prisma.restaurant.findUnique({ where: { id: ctx.restaurantId } });
    if (!r) return { error: "restaurante não encontrado" };
    const token = crypto.randomBytes(8).toString("hex");
    await redis.set(
      `menu:token:${token}`,
      JSON.stringify({ restaurantId: ctx.restaurantId, clientId: ctx.clientId, conversationId: ctx.conversationId }),
      "EX", 7200, // 2h
    );
    const url = `${env.WEB_PUBLIC_URL}/pedir/${r.slug}?c=${token}`;
    return { url, instruction: `Envie este link para o cliente montar o pedido: ${url}` };
  },

  async request_human_support(ctx, { reason }) {
    await prisma.conversation.update({
      where: { id: ctx.conversationId }, data: { status: "WAITING" },
    });
    await prisma.aiSession.updateMany({
      where: { conversationId: ctx.conversationId, active: true }, data: { active: false },
    });
    await prisma.auditLog.create({
      data: { restaurantId: ctx.restaurantId, action: "HUMAN_REQUESTED", entity: "Conversation", entityId: ctx.conversationId, metadata: { reason: reason ?? null } },
    });
    return { ok: true, message: "Atendente chamado. IA pausada nesta conversa." };
  },
};
