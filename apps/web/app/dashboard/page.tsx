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

const chart = [38, 58, 44, 76, 62, 91, 72, 84, 55, 88, 66, 96];

function Card({ label, value, tone = "orange" }: { label: string; value: string; tone?: "orange" | "green" | "blue" | "yellow" | "red" }) {
  const cls = tone === "green" ? "stamp-green" : tone === "blue" ? "stamp-blue" : tone === "yellow" ? "stamp-yellow" : tone === "red" ? "stamp-red" : "";
  return (
    <div className="ticket-card min-h-32 p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="text-xs font-bold uppercase" style={{ color: "var(--muted)" }}>{label}</div>
        <span className={`stamp ${cls}`}>Hoje</span>
      </div>
      <div className="mono-value text-3xl">{value}</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100">
        <div className="h-full rounded-full" style={{ width: `${Math.min(92, Math.max(28, Number(value.replace(/\D/g, "")) || 58))}%`, background: tone === "green" ? "var(--green)" : "var(--accent)" }} />
      </div>
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
      <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_360px]">
        <section className="receipt-card p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="page-title text-4xl">Dashboard</h1>
              <p className="page-intro mt-1 text-sm">
                {demo ? "Previa visual com dados demonstrativos enquanto a API/login nao responde." : "Resumo vivo do restaurante, pedidos e receita do dia."}
              </p>
            </div>
            <button className="stamp-button px-4 py-3 text-sm">Novo pedido</button>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card label="Pedidos" value={String(d.pedidosDoDia)} />
            <Card label="Faturamento" value={brl(d.faturamento)} tone="green" />
            <Card label="Prontos" value={String(d.emPreparo)} tone="blue" />
            <Card label="Em preparo" value={String(d.pendentes)} tone="yellow" />
          </div>
        </section>

        <section className="receipt-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="page-title text-2xl">Receita por hora</h2>
            <span className="stamp stamp-green">online</span>
          </div>
          <div className="flex h-44 items-end gap-2 rounded-[24px] bg-white/70 p-4">
            {chart.map((h, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full rounded-t-full" style={{ height: `${h}%`, minHeight: 16, background: i % 3 === 0 ? "var(--green)" : "linear-gradient(180deg, #ffb15f, var(--accent))" }} />
                <span className="text-[10px] font-bold muted-ink">{`${10 + i}h`}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="receipt-card">
        <div className="receipt-header flex items-center justify-between p-4">
          <h2 className="page-title text-2xl">Pedidos em andamento</h2>
          {demo && <span className="stamp stamp-blue">demo</span>}
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-4">
          {["NOVO", "EM PREPARO", "PRONTO", "FINALIZADO"].map((status, index) => (
            <div key={status} className="kanban-column p-3">
              <div className="mb-3 flex items-center justify-between pb-2">
                <span className={`stamp ${index === 1 ? "stamp-yellow" : index === 2 ? "stamp-green" : "stamp-blue"}`}>{status}</span>
                <span className="mono-value text-xs">{index === 0 ? 18 : index === 1 ? 12 : index === 2 ? 7 : 42}</span>
              </div>
              {demoOrders.filter((_, i) => i % 4 === index).map((o) => (
                <div key={o[0]} className="order-ticket mb-2 p-3 text-xs">
                  <div className="flex justify-between font-black"><span>{o[0]}</span><span className="price">{o[2]}</span></div>
                  <div className="muted-ink">{o[1]} - 2 itens</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="receipt-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="page-title text-2xl">Mais vendidos hoje</h2>
            <span className="stamp stamp-yellow">top menu</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {d.topProdutos.map((p, index) => (
              <article key={p.name} className="ticket-card flex items-center gap-3 p-3">
                <div className={`food-thumb h-20 w-20 shrink-0 ${p.name.toLowerCase().includes("pizza") ? "pizza" : p.name.toLowerCase().includes("batata") ? "fries" : ""}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black muted-ink">#{index + 1}</div>
                  <h3 className="truncate font-black">{p.name}</h3>
                  <div className="mono-value mt-1">{p.qty} vendidos</div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="receipt-card overflow-hidden p-5">
          <div className="food-thumb mb-4 h-36 w-full" />
          <h2 className="page-title text-2xl">Cardapio digital</h2>
          <p className="mt-1 text-sm muted-ink">Visual de app food para o cliente comprar rapido pelo celular.</p>
          <a href="/pedir/hamburguer" className="stamp-button mt-4 inline-flex px-4 py-3 text-sm">Ver loja publica</a>
        </div>
      </section>
    </div>
  );
}
