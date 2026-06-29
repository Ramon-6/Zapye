import { prisma } from "./prisma.js";
import { sendWhatsappText } from "./evolution.js";

// Mensagem por etapa do pedido (só as relevantes pro cliente).
const STATUS_MSG: Record<string, (code: number) => string> = {
  CONFIRMANDO: (c) => `Recebemos seu pedido #${c}! Já estamos confirmando. 📝`,
  PAGO: (c) => `Pagamento do pedido #${c} confirmado! ✅ Já vamos preparar.`,
  EM_PREPARO: (c) => `Seu pedido #${c} entrou em preparo. 👨‍🍳`,
  PRONTO: (c) => `Pedido #${c} está pronto! 🎉`,
  SAIU_PARA_ENTREGA: (c) => `Seu pedido #${c} saiu para entrega. 🛵`,
  FINALIZADO: (c) => `Pedido #${c} finalizado. Obrigado pela preferência! 🙌`,
  CANCELADO: (c) => `Seu pedido #${c} foi cancelado. Qualquer dúvida, estamos por aqui.`,
};

// Notifica o cliente, pelo WhatsApp da loja, sobre a nova etapa do pedido.
export async function notifyOrderStatus(orderId: string, status: string) {
  const build = STATUS_MSG[status];
  if (!build) return; // etapa sem aviso ao cliente

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { client: true },
  });
  if (!order) return;

  const instance = await prisma.whatsappInstance.findFirst({
    where: { restaurantId: order.restaurantId, connected: true },
  });
  if (!instance) return; // sem WhatsApp conectado, não há como avisar

  const jid = `${order.client.phone}@s.whatsapp.net`;
  try {
    await sendWhatsappText(instance.instanceName, jid, build(order.code));
  } catch (err) {
    console.error("notifyOrderStatus falhou:", (err as Error).message);
  }
}
