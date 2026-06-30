"use client";
import {
  Bell,
  CalendarDays,
  ChefHat,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Plus,
  ShoppingBag,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

const money = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

const columns = [
  { title: "Novo", count: 12, tone: "#CD6346", bg: "#F9E4DD", orders: [
    ["#1032", "Maria Silva", "2 itens", "11:24", 68.8],
    ["#1033", "Joao Santos", "3 itens", "11:25", 89.9],
    ["#1034", "Ana Paula", "1 item", "11:26", 32],
    ["#1035", "Carlos Alberto", "2 itens", "11:27", 55],
  ] },
  { title: "Em preparo", count: 8, tone: "#CD6346", bg: "#fff8f6", orders: [
    ["#1028", "Fernanda Lima", "2 itens", "11:20", 78],
    ["#1029", "Lucas Rocha", "3 itens", "11:21", 95.8],
    ["#1030", "Marcos Vinicius", "1 item", "11:22", 29.9],
    ["#1031", "Juliana Costa", "2 itens", "11:23", 64],
  ] },
  { title: "Prontos", count: 5, tone: "#4f7f74", bg: "rgba(136,187,175,0.18)", orders: [
    ["#1025", "Rafael Souza", "2 itens", "11:15", 62],
    ["#1026", "Beatriz Santos", "1 item", "11:16", 28],
    ["#1027", "Thiago Oliveira", "3 itens", "11:18", 79],
    ["#1024", "Clara Mendes", "2 itens", "11:10", 59],
  ] },
  { title: "Finalizados", count: 18, tone: "#58524b", bg: "#fff", orders: [
    ["#1019", "Paulo Cesar", "", "10:55", 45],
    ["#1020", "Andreia Lima", "", "10:58", 33],
    ["#1021", "Gabriel Martins", "", "11:02", 67.9],
    ["#1022", "Patricia Alves", "", "11:05", 84.5],
  ] },
];

const popular = [
  ["X-Burger Classico", "128 pedidos", "/food/burger-classic.png"],
  ["Batata Frita", "96 pedidos", "/food/fries.png"],
  ["Coca-Cola Lata", "74 pedidos", "/food/coke.png"],
  ["X-Bacon", "68 pedidos", "/food/burger-bacon.png"],
  ["Frango Grelhado", "52 pedidos", "/food/chicken.png"],
];

const latest = [
  ["#1032", "Maria Silva", "X-Burger Classico, Batata Frita", "R$ 68,80", "Novo", "Delivery", "11:24"],
  ["#1031", "Juliana Costa", "X-Bacon, Coca-Cola Lata", "R$ 64,00", "Em preparo", "Balcao", "11:23"],
  ["#1030", "Marcos Vinicius", "Pizza Calabresa", "R$ 29,90", "Em preparo", "Delivery", "11:22"],
  ["#1029", "Lucas Rocha", "Frango Grelhado, Batata Frita", "R$ 95,80", "Em preparo", "Balcao", "11:21"],
  ["#1028", "Fernanda Lima", "X-Salada, Suco de Laranja", "R$ 78,00", "Em preparo", "Delivery", "11:20"],
];

function TopControl({ children }: { children: ReactNode }) {
  return <button className="dashboard-control flex items-center gap-2 px-4 py-2 text-sm">{children}</button>;
}

function Kpi({ icon, label, value, delta, color }: { icon: React.ReactNode; label: string; value: string; delta: string; color: string }) {
  const compact = value.length > 8;
  return (
    <article className="receipt-card flex h-[122px] items-center gap-5 p-5">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] text-white" style={{ background: color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm muted-ink">{label}</div>
        <div className={`mt-1 font-bold tracking-tight ${compact ? "text-[1.55rem]" : "text-3xl"}`}>{value}</div>
        <div className="mt-4 text-sm"><span className="font-bold text-[#4f7f74]">{delta}</span> <span className="muted-ink">vs ontem</span></div>
      </div>
    </article>
  );
}

function MiniLineChart() {
  const points = "0,105 26,98 52,91 78,80 104,72 130,61 156,50 182,56 208,42 234,26 260,21 286,12";
  return (
    <div className="relative h-[92px] rounded-xl bg-[#fffdfa] px-6 py-3">
      <svg viewBox="0 0 310 124" className="h-full w-full overflow-visible" aria-label="Grafico de receita">
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="0" x2="300" y1={20 + i * 24} y2={20 + i * 24} stroke="#eadfd2" strokeWidth="1" />)}
        <polyline points={points} fill="none" stroke="#CD6346" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="286" cy="12" r="5" fill="#CD6346" stroke="#fff" strokeWidth="3" />
      </svg>
      <div className="absolute bottom-1 left-8 right-8 flex justify-between text-[10px] font-medium muted-ink">
        {["00", "04", "08", "12", "16", "20", "24"].map((h) => <span key={h}>{h}</span>)}
      </div>
      <div className="absolute right-3 top-[42px] rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-md">R$ 4.320,80</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="reference-stage max-w-[1180px]">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.65rem] font-extrabold tracking-tight">Ola, Admin! 👋</h1>
            <p className="mt-1 text-sm muted-ink">Aqui esta o resumo do seu restaurante hoje.</p>
          </div>
          <div className="flex items-center gap-3">
            <TopControl><CalendarDays size={17} />20/05/2025 <ChevronDown size={15} /></TopControl>
            <TopControl>Hoje <ChevronDown size={15} /></TopControl>
            <button className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm"><Bell size={20} /><span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#CD6346] text-[10px] font-bold text-white">3</span></button>
            <button className="stamp-button flex h-11 items-center gap-2 px-5 text-sm"><Plus size={18} /> Novo pedido</button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_300px]">
          <Kpi icon={<ShoppingBag size={28} />} label="Pedidos" value="72" delta="+12%" color="#CD6346" />
          <Kpi icon={<CircleDollarSign size={30} />} label="Faturamento" value="R$ 4.320,80" delta="+8%" color="#88BBAF" />
          <Kpi icon={<ChefHat size={30} />} label="Prontos" value="28" delta="+6%" color="#111111" />
          <article className="receipt-card p-4 lg:col-span-3 xl:col-span-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">Resumo do dia</h2>
              <button className="rounded-md border border-[rgba(17,17,17,.12)] px-3 py-1 text-xs">Hoje <ChevronDown className="inline" size={12} /></button>
            </div>
            <MiniLineChart />
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="receipt-card p-4">
            <h2 className="mb-4 text-lg font-bold">Pedidos ativos</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {columns.map((col) => (
                <div key={col.title} className="rounded-[10px] p-3" style={{ background: col.bg, border: "1px solid rgba(17,17,17,.10)" }}>
                  <div className="mb-3 text-sm font-semibold" style={{ color: col.tone }}>{col.title} <span className="text-xs font-normal muted-ink">({col.count})</span></div>
                  <div className="space-y-2">
                    {col.orders.map(([code, client, items, time, total]) => (
                      <article key={code} className="rounded-lg border border-[rgba(17,17,17,.10)] bg-white p-2 text-xs">
                        <div className="flex justify-between"><b>{code}</b><span className="muted-ink">{time}</span></div>
                        <div className="mt-1 font-semibold">{client}</div>
                        <div className="flex justify-between"><span className="muted-ink">{items}</span><span className="font-bold text-[#4f7f74]">{money(Number(total))}</span></div>
                      </article>
                    ))}
                  </div>
                  <button className="mx-auto mt-3 flex items-center gap-1 text-xs font-bold" style={{ color: col.tone }}>Ver todos <ChevronRight size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <section className="receipt-card p-4">
              <h2 className="mb-3 text-lg font-bold">Itens mais pedidos</h2>
              <div className="space-y-2">
                {popular.map(([name, qty, src]) => (
                  <article key={name} className="flex items-center gap-3 rounded-lg border border-[rgba(17,17,17,.10)] bg-white p-2">
                    <img src={src} alt={name} className="h-12 w-14 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{name}</div>
                      <div className="text-xs muted-ink">{qty}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="receipt-card overflow-hidden p-4">
            <h2 className="mb-4 text-lg font-bold">Ultimos pedidos</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="muted-ink">
                  <tr>{["Pedido", "Cliente", "Itens", "Total", "Status", "Tipo", "Horario"].map((h) => <th key={h} className="border-b border-[rgba(17,17,17,.10)] px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {latest.map((row) => (
                    <tr key={row[0]} className="border-b border-[rgba(17,17,17,.08)] last:border-0">
                      {row.map((cell, i) => (
                        <td key={i} className="px-3 py-2">
                          {i === 4 ? <span className="rounded-md bg-[#CD6346] px-3 py-1 text-[10px] font-bold text-white">{cell}</span> : i === 5 ? <span className="inline-flex items-center gap-1"><User size={13} />{cell}</span> : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="ml-auto mt-3 flex items-center gap-1 text-sm">Ver todos os pedidos <ChevronRight size={14} /></button>
          </div>

          <section className="receipt-card p-4">
            <h2 className="mb-4 text-lg font-bold">Formas de pagamento</h2>
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <div className="h-32 w-32 rounded-full" style={{ background: "conic-gradient(#CD6346 0 52%, #88BBAF 52% 82%, #F9E4DD 82% 96%, #111111 96% 100%)" }}>
                <div className="m-auto h-16 w-16 translate-y-8 rounded-full bg-white" />
              </div>
              <div className="space-y-3 text-xs">
                {[[ "#CD6346", "Cartao", "52%" ], [ "#88BBAF", "Pix", "30%" ], [ "#F9E4DD", "Dinheiro", "14%" ], [ "#111111", "Outros", "4%" ]].map(([c, l, v]) => (
                  <div key={l} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: c }} />{l}</span><b>{v}</b></div>
                ))}
              </div>
            </div>
            <div className="mt-5 text-center text-sm">Total: <b>R$ 4.320,80</b></div>
          </section>
        </section>
      </div>
    </div>
  );
}
