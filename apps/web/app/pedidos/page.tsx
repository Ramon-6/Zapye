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
const NEXT_STATUS: Record<string, { status: string; label: string }> = {
  NOVO: { status: "EM_PREPARO", label: "Iniciar preparo" },
  CONFIRMANDO: { status: "EM_PREPARO", label: "Confirmar e preparar" },
  PAGO: { status: "EM_PREPARO", label: "Iniciar preparo" },
  EM_PREPARO: { status: "PRONTO", label: "Marcar pronto" },
  PRONTO: { status: "SAIU_PARA_ENTREGA", label: "Saiu p/ entrega" },
  SAIU_PARA_ENTREGA: { status: "FINALIZADO", label: "Finalizar" },
};
const DEMO_ORDERS: Order[] = [
  { id: "demo-1025", code: 1025, status: "NOVO", total: 68, client: { name: "Mesa 05" }, items: [{ productName: "X-Burger Classico", quantity: 1 }, { productName: "Coca-Cola Lata", quantity: 1 }] },
  { id: "demo-1026", code: 1026, status: "NOVO", total: 45, client: { name: "Balcao" }, items: [{ productName: "Pizza Calabresa", quantity: 1 }] },
  { id: "demo-1019", code: 1019, status: "EM_PREPARO", total: 89.9, client: { name: "Mesa 03" }, items: [{ productName: "Frango Grelhado", quantity: 1 }, { productName: "Batata Frita", quantity: 1 }] },
  { id: "demo-1020", code: 1020, status: "EM_PREPARO", total: 55, client: { name: "Delivery" }, items: [{ productName: "X-Salada", quantity: 2 }] },
  { id: "demo-1014", code: 1014, status: "PRONTO", total: 35, client: { name: "Balcao" }, items: [{ productName: "Batata Frita", quantity: 1 }] },
  { id: "demo-1015", code: 1015, status: "PRONTO", total: 78, client: { name: "Mesa 02" }, items: [{ productName: "X-Bacon", quantity: 2 }] },
  { id: "demo-1013", code: 1013, status: "FINALIZADO", total: 48, client: { name: "Delivery" }, items: [{ productName: "X-Burger", quantity: 1 }] },
];

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [open, setOpen] = useState<boolean | null>(true);
  const [demo, setDemo] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Order[]>("/orders?today=true").then((data) => { setOrders(data); setDemo(false); setError(null); }).catch((e) => { setDemo(true); setError(e.message); });
    api<{ settings?: { isOpen: boolean } }>("/settings").then((r) => setOpen(r.settings?.isOpen ?? false)).catch(() => {});
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);

  async function toggleStore() {
    const next = !open;
    setOpen(next);
    try {
      await api("/settings/store-status", { method: "PATCH", body: JSON.stringify({ open: next }) });
      setError(null);
    } catch (e: any) {
      setOpen(!next);
      setError(e.message);
    }
  }

  async function setStatus(o: Order, status: string) {
    setBusy(o.id);
    try {
      await api(`/orders/${o.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(null);
  }

  async function confirmPayment(o: Order) {
    setBusy(o.id);
    try {
      await api(`/orders/${o.id}/confirm-payment`, { method: "POST" });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(null);
  }

  const inColumn = (key: string) =>
    orders.filter((o) => (key === "NOVO" ? NOVO_GROUP.includes(o.status) : o.status === key));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title handwrite text-4xl">Pedidos</h1>
          <p className="page-intro text-sm">{demo ? "Previa visual com comandas demonstrativas." : "Colunas como suporte de comandas da cozinha."}</p>
        </div>
        <button onClick={toggleStore} className={open ? "stamp-button px-4 py-2 text-sm" : "secondary-button px-4 py-2 text-sm"}>
          {open === null ? "..." : open ? "Loja aberta" : "Loja fechada"}
        </button>
      </div>
      {error && <div className="highlight-note mb-4 p-3 text-sm">Nao consegui sincronizar com a API: {error}</div>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const columnOrders = inColumn(col.key);
          return (
            <section key={col.key} className="kanban-column kanban-clip min-h-[32rem] p-3 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="handwrite text-xl font-black" style={{ color: "var(--text)" }}>{col.label}</h2>
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
                  <span className={`stamp stamp-big mt-2 ${col.stamp}`}>{col.label}</span>
                  {!demo && (
                    <div className="mt-3 grid gap-2">
                      {o.status === "AGUARDANDO_PIX" && (
                        <button disabled={busy === o.id} onClick={() => confirmPayment(o)} className="stamp-button px-3 py-2 text-xs disabled:opacity-50">
                          Confirmar Pix
                        </button>
                      )}
                      {NEXT_STATUS[o.status] && (
                        <button disabled={busy === o.id} onClick={() => setStatus(o, NEXT_STATUS[o.status].status)} className="stamp-button px-3 py-2 text-xs disabled:opacity-50">
                          {NEXT_STATUS[o.status].label}
                        </button>
                      )}
                      {!["FINALIZADO", "CANCELADO"].includes(o.status) && (
                        <button disabled={busy === o.id} onClick={() => setStatus(o, "CANCELADO")} className="secondary-button px-3 py-2 text-xs disabled:opacity-50">
                          Cancelar
                        </button>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
