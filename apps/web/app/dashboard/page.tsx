"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Dash = {
  pedidosDoDia: number; faturamento: number; ticketMedio: number;
  pendentes: number; emPreparo: number; emEntrega: number;
  topProdutos: { name: string; qty: number }[];
};

const DEMO_DASH: Dash = {
  pedidosDoDia: 18,
  faturamento: 456,
  ticketMedio: 45,
  pendentes: 12,
  emPreparo: 7,
  emEntrega: 3,
  topProdutos: [
    { name: "X-Burger Classico", qty: 28 },
    { name: "X-Bacon", qty: 16 },
    { name: "Pizza Calabresa", qty: 12 },
    { name: "Batata Frita", qty: 9 },
  ],
};

const demoOrders = [
  ["#1025", "Mesa 05", "R$ 68,00", "NOVO"],
  ["#1019", "Mesa 03", "R$ 89,90", "EM PREPARO"],
  ["#1014", "Balcao", "R$ 35,00", "PRONTO"],
  ["#1013", "Delivery", "R$ 48,00", "FINALIZADO"],
  ["#1026", "Balcao", "R$ 45,00", "NOVO"],
  ["#1020", "Delivery", "R$ 55,00", "EM PREPARO"],
  ["#1015", "Mesa 02", "R$ 78,00", "PRONTO"],
  ["#1012", "Mesa 01", "R$ 36,00", "FINALIZADO"],
];

function Card({ label, value, stamp, color = "stamp-blue" }: { label: string; value: string; stamp?: string; color?: string }) {
  return (
    <div className="ticket-card min-h-32 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="text-xs font-bold uppercase" style={{ color: "var(--muted)" }}>{label}</div>
        {stamp && <span className={`stamp ${color}`}>{stamp}</span>}
      </div>
      <div className="mono-value text-3xl">{value}</div>
      <div className="mt-1 text-xs muted-ink">pedidos</div>
    </div>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState<Dash>(DEMO_DASH);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    api<Dash>("/dashboard").then((data) => { setD(data); setDemo(false); }).catch(() => setDemo(true));
  }, []);

  const brl = (n: number) => `R$ ${n.toFixed(2)}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title handwrite text-4xl">Dashboard</h1>
          <p className="page-intro text-sm">{demo ? "Previa visual com dados demonstrativos enquanto a API/login nao responde." : "Resumo operacional como tickets colados no bloco do restaurante."}</p>
        </div>
        <span className="stamp stamp-green">Hoje</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Card label="Novo" value={String(d.pedidosDoDia)} stamp="NOVO" color="stamp-blue" />
        <Card label="Em preparo" value={String(d.pendentes)} stamp="EM PREPARO" color="stamp-yellow" />
        <Card label="Pronto" value={String(d.emPreparo)} stamp="PRONTO" color="stamp-green" />
        <Card label="Finalizado" value="42" stamp="FINALIZADO" color="stamp-green" />
        <Card label="Cancelado" value={String(d.emEntrega)} stamp="CANCELADO" color="stamp-red" />
      </div>

      <section className="receipt-card mt-6">
        <div className="receipt-header flex items-center justify-between p-4">
          <h2 className="page-title handwrite text-2xl">Pedidos em andamento</h2>
          {demo && <span className="stamp stamp-blue">demo</span>}
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-4">
          {["NOVO", "EM PREPARO", "PRONTO", "FINALIZADO"].map((status, index) => (
            <div key={status} className="kanban-column p-3">
              <div className="mb-3 flex items-center justify-between border-b border-dashed pb-2" style={{ borderColor: "var(--border)" }}>
                <span className={`stamp ${index === 1 ? "stamp-yellow" : index === 2 ? "stamp-green" : "stamp-blue"}`}>{status}</span>
                <span className="mono-value text-xs">{index === 0 ? 18 : index === 1 ? 12 : index === 2 ? 7 : 42}</span>
              </div>
              {demoOrders.filter((_, i) => i % 4 === index).map((o) => (
                <div key={o[0]} className="order-ticket mb-2 p-2 text-xs">
                  <div className="flex justify-between font-black"><span>{o[0]}</span><span className="price">{o[2]}</span></div>
                  <div className="muted-ink">{o[1]} - 2 itens</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="receipt-card mt-6 max-w-3xl">
        <div className="receipt-header flex items-center justify-between p-4">
          <h2 className="page-title handwrite text-2xl">Mais vendidos hoje</h2>
          <span className="stamp stamp-yellow">Top da chapa</span>
        </div>
        <div className="p-4">
          {d.topProdutos.length === 0 && <p className="text-sm muted-ink">Sem vendas ainda. A primeira linha da comanda fica esperando.</p>}
          {d.topProdutos.map((p, index) => (
            <div key={p.name} className="notebook-line flex justify-between py-3 text-sm last:border-0">
              <span><b className="mr-2 mono-value">#{index + 1}</b>{p.name}</span>
              <span className="mono-value">{p.qty}x</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
