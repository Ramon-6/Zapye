"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

type Dash = {
  pedidosDoDia: number; faturamento: number; ticketMedio: number;
  pendentes: number; emPreparo: number; emEntrega: number;
  topProdutos: { name: string; qty: number }[];
};

function Card({ label, value, stamp }: { label: string; value: string; stamp?: string }) {
  return (
    <div className="ticket-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="text-xs font-bold uppercase" style={{ color: "var(--muted)" }}>{label}</div>
        {stamp && <span className="stamp stamp-blue">{stamp}</span>}
      </div>
      <div className="mono-value text-3xl">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState<string>();

  useEffect(() => {
    api<Dash>("/dashboard").then(setD).catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return (
      <div className="receipt-card max-w-2xl p-6">
        <h1 className="page-title text-2xl">Dashboard</h1>
        <p className="mt-3 text-sm highlight-note p-3">Faca login para ver o dashboard. ({err})</p>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="receipt-card max-w-xl p-6">
        <h1 className="page-title text-2xl">Dashboard</h1>
        <p className="mt-3 text-sm muted-ink">Carregando a comanda do dia...</p>
      </div>
    );
  }

  const brl = (n: number) => `R$ ${n.toFixed(2)}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-3xl">Dashboard</h1>
          <p className="page-intro text-sm">Resumo operacional como tickets colados no bloco do restaurante.</p>
        </div>
        <span className="stamp stamp-green">Hoje</span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card label="Pedidos do dia" value={String(d.pedidosDoDia)} stamp="NOVO" />
        <Card label="Faturamento" value={brl(d.faturamento)} stamp="CAIXA" />
        <Card label="Ticket medio" value={brl(d.ticketMedio)} />
        <Card label="Pendentes" value={String(d.pendentes)} stamp="PEND" />
        <Card label="Em preparo" value={String(d.emPreparo)} stamp="FOGO" />
        <Card label="Em entrega" value={String(d.emEntrega)} stamp="RUA" />
      </div>

      <section className="receipt-card mt-6 max-w-3xl">
        <div className="receipt-header flex items-center justify-between p-4">
          <h2 className="page-title text-xl">Mais vendidos hoje</h2>
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
