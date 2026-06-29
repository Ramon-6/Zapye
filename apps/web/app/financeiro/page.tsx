"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Finance = {
  revenueToday: number; ordersToday: number; ticketToday: number;
  revenue30: number; orders30: number;
  byDay: { date: string; total: number }[];
  recent: { code: number; client: string | null; total: number; paymentMethod: string; date: string }[];
};

const brl = (n: number) => `R$ ${n.toFixed(2)}`;
const DEMO_FINANCE: Finance = {
  revenueToday: 12450,
  ordersToday: 256,
  ticketToday: 48.63,
  revenue30: 8130,
  orders30: 982,
  byDay: [
    { date: "2025-05-01", total: 820 }, { date: "2025-05-02", total: 1250 }, { date: "2025-05-03", total: 980 },
    { date: "2025-05-04", total: 1560 }, { date: "2025-05-05", total: 1420 }, { date: "2025-05-06", total: 1690 },
    { date: "2025-05-07", total: 1750 }, { date: "2025-05-08", total: 1320 }, { date: "2025-05-09", total: 1210 },
    { date: "2025-05-10", total: 1490 }, { date: "2025-05-11", total: 1030 }, { date: "2025-05-12", total: 1580 },
    { date: "2025-05-13", total: 1150 }, { date: "2025-05-14", total: 1270 },
  ],
  recent: [
    { code: 1027, client: "Joao Silva", total: 68, paymentMethod: "PIX", date: "2025-05-20" },
    { code: 1026, client: "Maria Clara", total: 52, paymentMethod: "CARTAO", date: "2025-05-20" },
    { code: 1025, client: "Ana Paula", total: 78, paymentMethod: "DINHEIRO", date: "2025-05-20" },
  ],
};

function Card({ label, value, stamp }: { label: string; value: string; stamp?: string }) {
  return (
    <div className="ticket-card p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-xs font-bold uppercase muted-ink">{label}</div>
        {stamp && <span className="stamp stamp-green">{stamp}</span>}
      </div>
      <div className="mono-value text-2xl">{value}</div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [d, setD] = useState<Finance>(DEMO_FINANCE);
  const [demo, setDemo] = useState(true);
  useEffect(() => { api<Finance>("/finance").then((data) => { setD(data); setDemo(false); }).catch(() => setDemo(true)); }, []);

  const max = Math.max(1, ...d.byDay.map((x) => x.total));

  return (
    <div>
      <h1 className="page-title handwrite text-4xl">Financeiro</h1>
      <p className="page-intro mb-5 text-sm">{demo ? "Previa visual com caixa demonstrativo." : "Receita dos pedidos finalizados no papel quadriculado."}</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Faturamento" value={brl(d.revenueToday)} stamp="caixa" />
        <Card label="Custos" value={brl(Math.round(d.revenueToday * 0.35))} />
        <Card label="Lucro" value={brl(d.revenue30)} stamp="lucro" />
        <Card label="Pedidos" value={String(d.ordersToday)} />
      </div>

      <section className="receipt-card mt-6">
        <div className="receipt-header flex items-center justify-between p-4">
          <h2 className="page-title handwrite text-2xl">Mes atual</h2>
          <span className="stamp stamp-yellow">feito a mao</span>
        </div>
        <div className="graph-paper flex h-64 items-end gap-2 p-5">
          {d.byDay.map((b) => (
            <div key={b.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: `${(b.total / max) * 100}%`, minHeight: 12 }}>
                <div className="h-full flex-1 border border-zinc-700/40" style={{ background: "repeating-linear-gradient(135deg, #2d2418 0 2px, transparent 2px 5px)" }} title={brl(b.total)} />
                <div className="h-[58%] flex-1 border border-amber-700/40" style={{ background: "repeating-linear-gradient(135deg, #d97706 0 4px, transparent 4px 7px)" }} />
                <div className="h-[72%] flex-1 border border-lime-700/40" style={{ background: "repeating-linear-gradient(135deg, #84cc16 0 4px, #65a30d 4px 7px)" }} />
              </div>
              <span className="text-[10px] font-bold muted-ink">{b.date.slice(5)}</span>
            </div>
          ))}
          <div className="ml-3 hidden w-24 self-center text-xs md:block">
            <div><span className="mr-1 inline-block h-2 w-4 bg-stone-800" />Faturamento</div>
            <div><span className="mr-1 inline-block h-2 w-4 bg-amber-600" />Custos</div>
            <div><span className="mr-1 inline-block h-2 w-4 bg-lime-500" />Lucro</div>
          </div>
        </div>
      </section>

      <section className="receipt-card mt-6 overflow-hidden">
        <div className="receipt-header p-4">
          <h2 className="page-title text-xl">Pedidos finalizados</h2>
        </div>
        {d.recent.length === 0 && <p className="p-4 text-sm muted-ink">Nenhum pedido finalizado ainda.</p>}
        {d.recent.map((o) => (
          <div key={o.code} className="notebook-line flex flex-wrap justify-between gap-2 p-3 text-sm">
            <span>#{o.code} - {o.client ?? "Cliente"}</span>
            <span><span className="muted-ink">{o.paymentMethod}</span> - <b className="price">{brl(o.total)}</b></span>
          </div>
        ))}
      </section>
    </div>
  );
}
