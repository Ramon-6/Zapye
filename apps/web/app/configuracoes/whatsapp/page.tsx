"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";

type Status = { instanceName: string; registered: boolean; connected: boolean; state: string };

export default function WhatsappPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>();

  const [polling, setPolling] = useState(false);

  const tick = useCallback(async () => {
    try {
      const s = await api<Status>("/settings/whatsapp");
      setStatus(s);
      if (s.connected) { setQr(null); setPairing(null); setPolling(false); return; }
      // enquanto não pareou, busca o QR mais recente (chega via webhook → Redis)
      if (polling) {
        const r = await api<{ qr: string | null }>("/settings/whatsapp/qr");
        if (r.qr) setQr(r.qr);
      }
    } catch (e) { setErr(String(e)); }
  }, [polling]);

  // Polling a cada 3s (detecta pareamento e atualiza o QR sem refresh).
  useEffect(() => {
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [tick]);

  async function connect() {
    setLoading(true); setErr(undefined); setQr(null);
    try {
      await api("/settings/whatsapp/connect", { method: "POST" });
      setPolling(true); // começa a buscar o QR
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  async function disconnect() {
    await api("/settings/whatsapp/disconnect", { method: "POST" });
    setQr(null); setPairing(null); setPolling(false); tick();
  }

  const connected = status?.connected;

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold">WhatsApp</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
        Conecte o número do restaurante para a IA atender automaticamente.
      </p>

      <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: connected ? "var(--accent)" : "var(--accent-warn)" }} />
          <span className="text-sm font-semibold">
            {connected ? "Conectado" : status?.state === "connecting" ? "Aguardando leitura do QR…" : "Desconectado"}
          </span>
        </div>

        {!connected && (
          <>
            {!qr && (
              <button onClick={connect} disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                style={{ background: "var(--accent)" }}>
                {loading ? "Gerando QR…" : "Conectar WhatsApp"}
              </button>
            )}

            {qr && (
              <div className="text-center">
                <p className="mb-3 text-sm" style={{ color: "var(--muted)" }}>
                  Abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e escaneie:
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR Code" className="mx-auto rounded-lg bg-white p-2" width={260} height={260} />
                {pairing && (
                  <p className="mt-3 text-sm">Ou use o código: <b style={{ color: "var(--accent)" }}>{pairing}</b></p>
                )}
                <button onClick={connect} className="mt-4 text-xs underline" style={{ color: "var(--muted)" }}>
                  Gerar novo QR
                </button>
              </div>
            )}
          </>
        )}

        {connected && (
          <button onClick={disconnect}
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--accent-warn)" }}>
            Desconectar
          </button>
        )}

        {err && <p className="mt-3 text-xs" style={{ color: "var(--accent-warn)" }}>{err}</p>}
      </div>
    </div>
  );
}
