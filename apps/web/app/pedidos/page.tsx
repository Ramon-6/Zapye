"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Order = {
  id: string; code: number; status: string; total: number;
  client: { name: string | null }; items: { productName: string; quantity: number }[];
};

const COLUMNS = [
  { key: "NOVO", label: "Novos" },
  { key: "EM_PREPARO", label: "Em preparo" },
  { key: "PRONTO", label: "Prontos" },
  { key: "SAIU_PARA_ENTREGA", label: "Em entrega" },
  { key: "FINALIZADO", label: "Finalizados" },
];
// inclui status intermediários nas colunas de "Novos"
const NOVO_GROUP = ["NOVO", "CONFIRMANDO", "AGUARDANDO_PIX", "AGUARDANDO_VALIDACAO_HUMANA", "PAGO"];

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState<boolean | null>(null);

  const load = useCallback(() => {
    api<Order[]>("/orders?today=true").then(setOrders).catch(() => {});
    api<{ settings?: { isOpen: boolean } }>("/settings").then((r) => setOpen(r.settings?.isOpen ?? false)).catch(() => {});
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function toggleStore() {
    const next = !open;
    setOpen(next);
    await api("/settings/store-status", { method: "PATCH", body: JSON.stringify({ open: next }) });
  }

  const inColumn = (key: string) =>
    orders.filter((o) => (key === "NOVO" ? NOVO_GROUP.includes(o.status) : o.status === key));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <button onClick={toggleStore}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: open ? "var(--accent)" : "var(--border)", color: open ? "#000" : "var(--muted)" }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: open ? "#000" : "var(--accent-warn)" }} />
          {open === null ? "…" : open ? "Loja aberta" : "Loja fechada"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {COLUMNS.map((col) => (
          <div key={col.key} className="rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="mb-3 text-sm font-semibold" style={{ color: "var(--muted)" }}>
              {col.label} <span className="opacity-60">({inColumn(col.key).length})</span>
            </div>
            {inColumn(col.key).map((o) => (
              <div key={o.id} className="mb-2 rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between text-sm font-bold">
                  <span>#{o.code}</span>
                  <span style={{ color: "var(--accent)" }}>R$ {Number(o.total).toFixed(2)}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>
                  {o.client.name ?? "Cliente"} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(ns)
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
