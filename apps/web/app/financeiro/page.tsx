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

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

export default function FinanceiroPage() {
  const [d, setD] = useState<Finance | null>(null);
  const [err, setErr] = useState<string>();
  useEffect(() => { api<Finance>("/finance").then(setD).catch((e) => setErr(String(e))); }, []);

  if (err) return <p style={{ color: "var(--accent-warn)" }}>Faça login para ver o financeiro.</p>;
  if (!d) return <p style={{ color: "var(--muted)" }}>Carregando…</p>;

  const max = Math.max(1, ...d.byDay.map((x) => x.total));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Financeiro</h1>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>Receita de pedidos finalizados.</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="Receita hoje" value={brl(d.revenueToday)} accent />
        <Card label="Pedidos hoje" value={String(d.ordersToday)} />
        <Card label="Ticket médio hoje" value={brl(d.ticketToday)} />
        <Card label="Receita 30 dias" value={brl(d.revenue30)} accent />
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Últimos 7 dias</h2>
      <div className="flex items-end gap-2 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)", height: 160 }}>
        {d.byDay.map((b) => (
          <div key={b.date} className="flex flex-1 flex-col items-center justify-end gap-1">
            <div className="w-full rounded-t" style={{ height: `${(b.total / max) * 100}%`, background: "var(--accent)", minHeight: 2 }} title={brl(b.total)} />
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>{b.date.slice(5)}</span>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Pedidos finalizados</h2>
      <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {d.recent.length === 0 && <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>Nenhum pedido finalizado ainda.</p>}
        {d.recent.map((o) => (
          <div key={o.code} className="flex justify-between border-b p-3 text-sm last:border-0" style={{ borderColor: "var(--border)" }}>
            <span>#{o.code} · {o.client ?? "Cliente"}</span>
            <span><span style={{ color: "var(--muted)" }}>{o.paymentMethod}</span> · <b style={{ color: "var(--accent)" }}>{brl(o.total)}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}
