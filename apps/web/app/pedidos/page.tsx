"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Order = {
  id: string; code: number; status: string; total: number;
  client: { name: string | null }; items: { productName: string; quantity: number }[];
};

const COLUMNS = [
  { key: "NOVO", label: "Novos", stamp: "stamp-blue" },
  { key: "EM_PREPARO", label: "Em preparo", stamp: "stamp-yellow" },
  { key: "PRONTO", label: "Prontos", stamp: "stamp-green" },
  { key: "SAIU_PARA_ENTREGA", label: "Em entrega", stamp: "stamp-blue" },
  { key: "FINALIZADO", label: "Finalizados", stamp: "stamp-green" },
];
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-3xl">Pedidos</h1>
          <p className="page-intro text-sm">Colunas como suporte de comandas da cozinha.</p>
        </div>
        <button onClick={toggleStore} className={open ? "stamp-button px-4 py-2 text-sm" : "secondary-button px-4 py-2 text-sm"}>
          {open === null ? "..." : open ? "Loja aberta" : "Loja fechada"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const columnOrders = inColumn(col.key);
          return (
            <section key={col.key} className="kanban-column min-h-72 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase" style={{ color: "var(--muted)" }}>{col.label}</h2>
                <span className={`stamp ${col.stamp}`}>{columnOrders.length}</span>
              </div>
              {columnOrders.length === 0 && <p className="text-xs muted-ink">Nenhuma comanda presa aqui.</p>}
              {columnOrders.map((o) => (
                <article key={o.id} className="order-ticket mb-3 p-3">
                  <div className="receipt-header mb-2 flex justify-between pb-2 text-sm font-black">
                    <span>#{o.code}</span>
                    <span className="price">R$ {Number(o.total).toFixed(2)}</span>
                  </div>
                  <div className="text-xs muted-ink">{o.client.name ?? "Cliente"}</div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {o.items.slice(0, 3).map((it, i) => (
                      <li key={i}><b>{it.quantity}x</b> {it.productName}</li>
                    ))}
                  </ul>
                  <div className="receipt-divider mt-3 pt-2 text-xs muted-ink">
                    {o.items.reduce((s, i) => s + i.quantity, 0)} item(ns)
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
