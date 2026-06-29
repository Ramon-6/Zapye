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
const DEMO_KITCHEN: Order[] = [
  { id: "k-1020", code: 1020, status: "EM_PREPARO", total: 55, client: { name: "Mesa 03" }, items: [{ quantity: 1, productName: "X-Burger Classico", notes: "Sem gelo" }, { quantity: 1, productName: "Batata Frita", notes: null }, { quantity: 1, productName: "Coca-Cola Lata", notes: null }] },
  { id: "k-1021", code: 1021, status: "EM_PREPARO", total: 62, client: { name: "Mesa 07" }, items: [{ quantity: 1, productName: "Frango Grelhado", notes: null }, { quantity: 1, productName: "Arroz Branco", notes: null }, { quantity: 1, productName: "Suco de Laranja", notes: null }] },
  { id: "k-1022", code: 1022, status: "PAGO", total: 48, client: { name: "Delivery" }, items: [{ quantity: 1, productName: "Pizza Calabresa", notes: "Tocar interfone" }, { quantity: 1, productName: "Coca-Cola 2L", notes: null }] },
  { id: "k-1023", code: 1023, status: "PAGO", total: 37, client: { name: "Balcao" }, items: [{ quantity: 2, productName: "Pastel de Carne", notes: null }, { quantity: 1, productName: "Guarana Lata", notes: null }] },
  { id: "k-1024", code: 1024, status: "EM_PREPARO", total: 71, client: { name: "Mesa 01" }, items: [{ quantity: 1, productName: "Parmegiana", notes: null }, { quantity: 1, productName: "Spaghetti", notes: null }, { quantity: 1, productName: "Suco de Abacaxi", notes: null }] },
  { id: "k-1025", code: 1025, status: "PAGO", total: 69, client: { name: "Mesa 05" }, items: [{ quantity: 1, productName: "Pizza Portuguesa", notes: null }, { quantity: 1, productName: "Coca-Cola Lata", notes: null }] },
];

export default function CozinhaPage() {
  const [orders, setOrders] = useState<Order[]>(DEMO_KITCHEN);
  const [demo, setDemo] = useState(true);

  const load = useCallback(() => {
    api<Order[]>("/orders?today=true").then((data) => { if (data.length) { setOrders(data); setDemo(false); } }).catch(() => setDemo(true));
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
        <h1 className="page-title handwrite text-4xl">Painel da Cozinha</h1>
        <p className="page-intro text-sm">{demo ? "Previa visual com comandas demonstrativas." : "Comandas grandes, legiveis e prontas para avancar no fluxo."}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cooking.length === 0 && (
          <div className="receipt-card p-5 text-sm muted-ink">Nenhum pedido na cozinha.</div>
        )}
        {cooking.map((o) => (
          <article key={o.id} className="receipt-card p-4">
            <div className="receipt-header mb-3 flex items-start justify-between pb-3">
              <div>
                <div className="page-title handwrite text-3xl">#{o.code}</div>
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
            <div className="mb-3 flex justify-end">
              <span className={`stamp stamp-big ${statusStamp(o.status)}`}>{o.status === "EM_PREPARO" ? "Fogo medio" : "Novo"}</span>
            </div>
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
