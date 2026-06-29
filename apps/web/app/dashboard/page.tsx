"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Dash = {
  pedidosDoDia: number; faturamento: number; ticketMedio: number;
  pendentes: number; emPreparo: number; emEntrega: number;
  topProdutos: { name: string; qty: number }[];
};

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color: accent ? "var(--accent)" : "var(--text)" }}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    api<Dash>("/dashboard").then(setD).catch((e) => setErr(String(e)));
  }, []);

  if (err) return <p style={{ color: "var(--accent-warn)" }}>Faça login para ver o dashboard. ({err})</p>;
  if (!d) return <p style={{ color: "var(--muted)" }}>Carregando…</p>;

  const brl = (n: number) => `R$ ${n.toFixed(2)}`;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card label="Pedidos do dia" value={String(d.pedidosDoDia)} />
        <Card label="Faturamento" value={brl(d.faturamento)} accent />
        <Card label="Ticket médio" value={brl(d.ticketMedio)} />
        <Card label="Pendentes" value={String(d.pendentes)} />
        <Card label="Em preparo" value={String(d.emPreparo)} />
        <Card label="Em entrega" value={String(d.emEntrega)} />
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Mais vendidos hoje</h2>
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {d.topProdutos.length === 0 && <p style={{ color: "var(--muted)" }}>Sem vendas ainda.</p>}
        {d.topProdutos.map((p) => (
          <div key={p.name} className="flex justify-between border-b py-2 text-sm last:border-0" style={{ borderColor: "var(--border)" }}>
            <span>{p.name}</span>
            <span style={{ color: "var(--muted)" }}>{p.qty}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}
