"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Order = {
  id: string; code: number; status: string; total: number;
  client: { name: string | null };
  items: { productName: string; quantity: number; notes: string | null }[];
};

// Próximo status no fluxo da cozinha.
const NEXT: Record<string, string> = {
  PAGO: "EM_PREPARO",
  EM_PREPARO: "PRONTO",
  PRONTO: "SAIU_PARA_ENTREGA",
};
const LABEL: Record<string, string> = {
  PAGO: "Iniciar preparo",
  EM_PREPARO: "Marcar pronto",
  PRONTO: "Saiu p/ entrega",
};

export default function CozinhaPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(() => {
    api<Order[]>("/orders?today=true").then(setOrders).catch(() => {});
  }, []);

  // Polling simples a cada 5s (v1). v2: SSE/WebSocket.
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function advance(o: Order) {
    const next = NEXT[o.status];
    if (!next) return;
    await api(`/orders/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    load();
  }

  const cooking = orders.filter((o) => ["PAGO", "EM_PREPARO", "PRONTO"].includes(o.status));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Painel da Cozinha</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cooking.length === 0 && <p style={{ color: "var(--muted)" }}>Nenhum pedido na cozinha.</p>}
        {cooking.map((o) => (
          <div key={o.id} className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-lg font-bold">#{o.code}</span>
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--border)", color: "var(--muted)" }}>{o.status}</span>
            </div>
            <div className="mb-2 text-xs" style={{ color: "var(--muted)" }}>{o.client.name ?? "Cliente"}</div>
            <ul className="mb-3 space-y-1 text-sm">
              {o.items.map((it, i) => (
                <li key={i}>
                  <span className="font-semibold">{it.quantity}x</span> {it.productName}
                  {it.notes && <span style={{ color: "var(--accent-warn)" }}> · {it.notes}</span>}
                </li>
              ))}
            </ul>
            {NEXT[o.status] && (
              <button onClick={() => advance(o)} className="w-full rounded-lg py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>
                {LABEL[o.status]}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
