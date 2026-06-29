import crypto from "node:crypto";
import { env } from "../config/env.js";

// ─────────────────────────────────────────────────────────────
// MODO VIRTUAL / TESTE
// Simula um Pix do Mercado Pago sem chamar a API real. Gera um
// "copia e cola" e um txid fake. A confirmação é feita pelo botão
// "já paguei" (rota simulate-payment), imitando o webhook do MP.
// Quando PAYMENT_MODE=mercadopago, trocar createPix por chamada real.
// ─────────────────────────────────────────────────────────────

export type PixCharge = {
  provider: "virtual" | "mercadopago";
  txid: string;
  amount: number;
  code: string; // copia e cola
};

export function createPix(amount: number, ref: string): PixCharge {
  if (env.PAYMENT_MODE === "mercadopago") {
    // TODO: integração real (POST /v1/payments com payment_method_id=pix)
    throw new Error("Mercado Pago real ainda não configurado");
  }
  const txid = crypto.randomBytes(12).toString("hex");
  const code =
    `00020126BR.GOV.BCB.PIX.VIRTUAL.${txid}` +
    `520400005303986540${amount.toFixed(2)}5802BR5909ZAPYEFOOD6009SAOPAULO62070503${ref.slice(0, 3)}6304TESTE`;
  return { provider: "virtual", txid, amount, code };
}
