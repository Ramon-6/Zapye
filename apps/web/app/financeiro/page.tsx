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
  const [d, setD] = useState<Finance | null>(null);
  const [err, setErr] = useState<string>();
  useEffect(() => { api<Finance>("/finance").then(setD).catch((e) => setErr(String(e))); }, []);

  if (err) return <div className="receipt-card p-5 text-sm highlight-note">Faca login para ver o financeiro.</div>;
  if (!d) return <div className="receipt-card p-5 text-sm muted-ink">Carregando grafico do caixa...</div>;

  const max = Math.max(1, ...d.byDay.map((x) => x.total));

  return (
    <div>
      <h1 className="page-title text-3xl">Financeiro</h1>
      <p className="page-intro mb-5 text-sm">Receita dos pedidos finalizados no papel quadriculado.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Receita hoje" value={brl(d.revenueToday)} stamp="caixa" />
        <Card label="Pedidos hoje" value={String(d.ordersToday)} />
        <Card label="Ticket medio hoje" value={brl(d.ticketToday)} />
        <Card label="Receita 30 dias" value={brl(d.revenue30)} stamp="30d" />
      </div>

      <section className="receipt-card mt-6">
        <div className="receipt-header flex items-center justify-between p-4">
          <h2 className="page-title text-xl">Ultimos 7 dias</h2>
          <span className="stamp stamp-yellow">feito a mao</span>
        </div>
        <div className="graph-paper flex h-56 items-end gap-3 p-5">
          {d.byDay.map((b) => (
            <div key={b.date} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="w-full rounded-t-sm border border-lime-700/50" style={{ height: `${(b.total / max) * 100}%`, background: "repeating-linear-gradient(135deg, #84cc16 0 5px, #65a30d 5px 8px)", minHeight: 4 }} title={brl(b.total)} />
              <span className="text-[10px] font-bold muted-ink">{b.date.slice(5)}</span>
            </div>
          ))}
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
