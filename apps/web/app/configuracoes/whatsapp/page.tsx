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
      if (polling) {
        const r = await api<{ qr: string | null }>("/settings/whatsapp/qr");
        if (r.qr) setQr(r.qr);
      }
    } catch (e) { setErr(String(e)); }
  }, [polling]);

  useEffect(() => {
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [tick]);

  async function connect() {
    setLoading(true); setErr(undefined); setQr(null);
    try {
      await api("/settings/whatsapp/connect", { method: "POST" });
      setPolling(true);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  }

  async function disconnect() {
    await api("/settings/whatsapp/disconnect", { method: "POST" });
    setQr(null); setPairing(null); setPolling(false); tick();
  }

  const connected = status?.connected;

  return (
    <div className="max-w-4xl">
      <h1 className="page-title text-3xl">WhatsApp</h1>
      <p className="page-intro mb-5 text-sm">QR em destaque sobre a comanda do restaurante.</p>

      <div className="receipt-card grid gap-5 p-5 md:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className={connected ? "stamp stamp-green" : "stamp stamp-yellow"}>
              {connected ? "Conectado" : status?.state === "connecting" ? "Aguardando QR" : "Desconectado"}
            </span>
          </div>

          {!connected && (
            <>
              {!qr && (
                <button onClick={connect} disabled={loading} className="stamp-button px-4 py-2 text-sm disabled:opacity-50">
                  {loading ? "Gerando QR..." : "Conectar WhatsApp"}
                </button>
              )}

              {qr && (
                <div>
                  <p className="mb-3 text-sm muted-ink">
                    Abra o WhatsApp, toque em Aparelhos conectados e escaneie o recibo ao lado.
                  </p>
                  {pairing && <p className="mt-3 text-sm">Codigo: <b className="price">{pairing}</b></p>}
                  <button onClick={connect} className="secondary-button mt-4 px-3 py-2 text-xs">Gerar novo QR</button>
                </div>
              )}
            </>
          )}

          {connected && (
            <button onClick={disconnect} className="secondary-button px-4 py-2 text-sm" style={{ color: "var(--danger)" }}>
              Desconectar
            </button>
          )}

          {err && <p className="highlight-note mt-3 p-2 text-xs">{err}</p>}
        </div>

        <div className="ticket-card flex min-h-64 items-center justify-center p-4 text-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR Code" className="rounded-lg bg-white p-2" width={230} height={230} />
          ) : (
            <div>
              <div className="brand-wordmark text-2xl">ZAPYE<br /><span className="brand-food">Food</span></div>
              <div className="receipt-divider mt-4 pt-4 text-xs muted-ink">O QR aparece aqui quando a conexao for iniciada.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
