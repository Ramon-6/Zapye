import { env } from "../config/env.js";

const headers = () => ({ "Content-Type": "application/json", apikey: env.EVOLUTION_API_KEY });

async function evo(path: string, init?: RequestInit) {
  const res = await fetch(`${env.EVOLUTION_BASE_URL}${path}`, { ...init, headers: headers() });
  const body = await res.text();
  let json: any = null;
  try { json = body ? JSON.parse(body) : null; } catch { /* texto puro */ }
  if (!res.ok) throw new Error(`Evolution ${path} (${res.status}): ${body}`);
  return json;
}

// Envia texto. POST /message/sendText/{instance}
export async function sendWhatsappText(instanceName: string, toJid: string, text: string) {
  return evo(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: toJid, text }),
  });
}

// Cria a instância (idempotente: ignora "já existe"). POST /instance/create
export async function createInstance(instanceName: string) {
  try {
    return await evo(`/instance/create`, {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (/already in use|already exists|già|exists/i.test(msg)) return { exists: true };
    throw err;
  }
}

// Gera/retorna o QR para parear. GET /instance/connect/{instance}
// Retorna { base64, code, pairingCode } conforme a Evolution.
export async function connectInstance(instanceName: string) {
  return evo(`/instance/connect/${instanceName}`);
}

// Estado da conexão. GET /instance/connectionState/{instance}
// → { instance: { state: "open" | "connecting" | "close" } }
export async function getConnectionState(instanceName: string) {
  return evo(`/instance/connectionState/${instanceName}`);
}

// Desconecta (logout) sem apagar a instância. DELETE /instance/logout/{instance}
export async function logoutInstance(instanceName: string) {
  return evo(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

// Configura o webhook da instância apontando p/ nossa API (base64 ligado p/ QR).
// A Evolution envia eventos para a rede interna do compose (host "api").
export async function setInstanceWebhook(instanceName: string) {
  return evo(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: "http://api:3333/webhooks/evolution",
        byEvents: false,
        base64: true,
        events: ["QRCODE_UPDATED", "MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    }),
  });
}
