"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Order = {
  id: string; code: number; status: string; total: number;
  client: { name: string | null };
  items: { productName: string; quantity: number; notes: string | null }[];
};

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

const statusStamp = (status: string) => {
  if (status === "EM_PREPARO") return "stamp-yellow";
  if (status === "PRONTO") return "stamp-green";
  return "stamp-blue";
};

export default function CozinhaPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(() => {
    api<Order[]>("/orders?today=true").then(setOrders).catch(() => {});
  }, []);

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
      <div className="mb-5">
        <h1 className="page-title text-3xl">Painel da Cozinha</h1>
        <p className="page-intro text-sm">Comandas grandes, legiveis e prontas para avancar no fluxo.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cooking.length === 0 && (
          <div className="receipt-card p-5 text-sm muted-ink">Nenhum pedido na cozinha.</div>
        )}
        {cooking.map((o) => (
          <article key={o.id} className="receipt-card p-4">
            <div className="receipt-header mb-3 flex items-start justify-between pb-3">
              <div>
                <div className="page-title text-2xl">#{o.code}</div>
                <div className="text-xs muted-ink">{o.client.name ?? "Cliente"}</div>
              </div>
              <span className={`stamp ${statusStamp(o.status)}`}>{o.status.replaceAll("_", " ")}</span>
            </div>
            <ul className="mb-4 space-y-2 text-sm">
              {o.items.map((it, i) => (
                <li key={i} className="notebook-line pb-2">
                  <span className="mono-value mr-2">{it.quantity}x</span>{it.productName}
                  {it.notes && <div className="highlight-note mt-1 p-2 text-xs">{it.notes}</div>}
                </li>
              ))}
            </ul>
            {NEXT[o.status] && (
              <button onClick={() => advance(o)} className="stamp-button w-full px-4 py-3 text-sm">
                {LABEL[o.status]}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
