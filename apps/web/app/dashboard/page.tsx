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
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

const money = (n: number) => `R$ ${Number(n).toFixed(2).replace(".", ",")}`;

type Dashboard = {
  pedidosDoDia: number;
  faturamento: number;
  ticketMedio: number;
  pendentes: number;
  emPreparo: number;
  emEntrega: number;
  topProdutos: { name: string; qty: number }[];
};

type Order = {
  id: string;
  code: number;
  status: string;
  total: number;
  deliveryType: string;
  createdAt: string;
  client: { name: string | null };
  items: { productName: string; quantity: number }[];
};

const columnMeta = [
  { key: "NOVO", title: "Novo", tone: "#CD6346", bg: "#F9E4DD", statuses: ["NOVO", "CONFIRMANDO", "AGUARDANDO_PIX", "AGUARDANDO_VALIDACAO_HUMANA", "PAGO"] },
  { key: "EM_PREPARO", title: "Em preparo", tone: "#CD6346", bg: "#fff8f6", statuses: ["EM_PREPARO"] },
  { key: "PRONTO", title: "Prontos", tone: "#4f7f74", bg: "rgba(136,187,175,0.18)", statuses: ["PRONTO", "SAIU_PARA_ENTREGA"] },
  { key: "FINALIZADO", title: "Finalizados", tone: "#58524b", bg: "#fff", statuses: ["FINALIZADO"] },
];

const statusLabel: Record<string, string> = {
  NOVO: "Novo",
  CONFIRMANDO: "Confirmando",
  AGUARDANDO_PIX: "Aguardando Pix",
  AGUARDANDO_VALIDACAO_HUMANA: "Validacao",
  PAGO: "Pago",
  EM_PREPARO: "Em preparo",
  PRONTO: "Pronto",
  SAIU_PARA_ENTREGA: "Em entrega",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

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
        <div className="mt-4 text-sm"><span className="font-bold text-[#4f7f74]">{delta}</span></div>
      </div>
    </article>
  );
}

function MiniLineChart({ total }: { total: number }) {
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
      <div className="absolute right-3 top-[42px] rounded-lg bg-white px-3 py-2 text-xs font-bold shadow-md">{money(total)}</div>
    </div>
  );
}

function foodImage(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bacon")) return "/food/burger-bacon.png";
  if (n.includes("batata")) return "/food/fries.png";
  if (n.includes("coca") || n.includes("cola")) return "/food/coke.png";
  if (n.includes("frango")) return "/food/chicken.png";
  return "/food/burger-classic.png";
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [dashboard, todayOrders] = await Promise.all([
          api<Dashboard>("/dashboard"),
          api<Order[]>("/orders?today=true"),
        ]);
        if (!alive) return;
        setData(dashboard);
        setOrders(todayOrders);
        setError(null);
      } catch (e: any) {
        if (alive) setError(e.message);
      }
    }
    load();
    const t = setInterval(load, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const columns = useMemo(() => columnMeta.map((col) => {
    const colOrders = orders.filter((o) => col.statuses.includes(o.status));
    return { ...col, count: colOrders.length, orders: colOrders.slice(0, 4) };
  }), [orders]);

  const pending = data?.pendentes ?? columns[0]?.count ?? 0;
  const ready = orders.filter((o) => ["PRONTO", "SAIU_PARA_ENTREGA"].includes(o.status)).length;
  const popular = data?.topProdutos ?? [];
  const latest = orders.slice(0, 5);

  return (
    <div className="reference-stage max-w-[1180px]">
      <div className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[1.65rem] font-extrabold tracking-tight">Ola, Admin!</h1>
            <p className="mt-1 text-sm muted-ink">{error ? "Aguardando conexao com a API." : "Aqui esta o resumo real do seu restaurante hoje."}</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <TopControl><CalendarDays size={17} />Hoje <ChevronDown size={15} /></TopControl>
            <TopControl>Tempo real <ChevronDown size={15} /></TopControl>
            <button className="relative grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm">
              <Bell size={20} />
              {pending > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#CD6346] text-[10px] font-bold text-white">{pending}</span>}
            </button>
            <a href="/pedidos" className="stamp-button flex h-11 items-center gap-2 px-4 text-sm"><Plus size={18} /> Novo pedido</a>
          </div>
        </header>

        {error && <div className="highlight-note p-3 text-sm">Dashboard ainda nao sincronizou: {error}</div>}

        <section className="grid gap-4 lg:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_300px]">
          <Kpi icon={<ShoppingBag size={28} />} label="Pedidos" value={String(data?.pedidosDoDia ?? orders.length)} delta={`${pending} pendente(s)`} color="#CD6346" />
          <Kpi icon={<CircleDollarSign size={30} />} label="Faturamento" value={money(data?.faturamento ?? 0)} delta={`Ticket ${money(data?.ticketMedio ?? 0)}`} color="#88BBAF" />
          <Kpi icon={<ChefHat size={30} />} label="Prontos" value={String(ready)} delta={`${data?.emPreparo ?? 0} em preparo`} color="#111111" />
          <article className="receipt-card p-4 lg:col-span-3 xl:col-span-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">Resumo do dia</h2>
              <button className="rounded-md border border-[rgba(17,17,17,.12)] px-3 py-1 text-xs">Hoje <ChevronDown className="inline" size={12} /></button>
            </div>
            <MiniLineChart total={data?.faturamento ?? 0} />
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
                    {col.orders.length === 0 && <p className="text-xs muted-ink">Sem pedidos.</p>}
                    {col.orders.map((o) => (
                      <article key={o.id} className="rounded-lg border border-[rgba(17,17,17,.10)] bg-white p-2 text-xs">
                        <div className="flex justify-between"><b>#{o.code}</b><span className="muted-ink">{new Date(o.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
                        <div className="mt-1 font-semibold">{o.client.name ?? "Cliente"}</div>
                        <div className="flex justify-between"><span className="muted-ink">{o.items.reduce((s, i) => s + i.quantity, 0)} item(ns)</span><span className="font-bold text-[#4f7f74]">{money(o.total)}</span></div>
                      </article>
                    ))}
                  </div>
                  <a href="/pedidos" className="mx-auto mt-3 flex items-center gap-1 text-xs font-bold" style={{ color: col.tone }}>Ver todos <ChevronRight size={13} /></a>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <section className="receipt-card p-4">
              <h2 className="mb-3 text-lg font-bold">Itens mais pedidos</h2>
              <div className="space-y-2">
                {popular.length === 0 && <p className="text-sm muted-ink">Os itens mais pedidos aparecem aqui quando entrarem pedidos hoje.</p>}
                {popular.map((item) => (
                  <article key={item.name} className="flex items-center gap-3 rounded-lg border border-[rgba(17,17,17,.10)] bg-white p-2">
                    <img src={foodImage(item.name)} alt={item.name} className="h-12 w-14 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{item.name}</div>
                      <div className="text-xs muted-ink">{item.qty} pedido(s)</div>
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
                  {latest.map((o) => (
                    <tr key={o.id} className="border-b border-[rgba(17,17,17,.08)] last:border-0">
                      <td className="px-3 py-2">#{o.code}</td>
                      <td className="px-3 py-2">{o.client.name ?? "Cliente"}</td>
                      <td className="px-3 py-2">{o.items.map((i) => i.productName).join(", ")}</td>
                      <td className="px-3 py-2">{money(o.total)}</td>
                      <td className="px-3 py-2"><span className="rounded-md bg-[#CD6346] px-3 py-1 text-[10px] font-bold text-white">{statusLabel[o.status] ?? o.status}</span></td>
                      <td className="px-3 py-2"><span className="inline-flex items-center gap-1"><User size={13} />{o.deliveryType === "ENTREGA" ? "Delivery" : "Retirada"}</span></td>
                      <td className="px-3 py-2">{new Date(o.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {latest.length === 0 && <p className="p-3 text-sm muted-ink">Nenhum pedido hoje.</p>}
            <a href="/pedidos" className="ml-auto mt-3 flex items-center gap-1 text-sm">Ver todos os pedidos <ChevronRight size={14} /></a>
          </div>

          <section className="receipt-card p-4">
            <h2 className="mb-4 text-lg font-bold">Formas de pagamento</h2>
            <div className="grid grid-cols-[140px_1fr] items-center gap-4">
              <div className="h-32 w-32 rounded-full" style={{ background: "conic-gradient(#CD6346 0 52%, #88BBAF 52% 82%, #F9E4DD 82% 96%, #111111 96% 100%)" }}>
                <div className="m-auto h-16 w-16 translate-y-8 rounded-full bg-white" />
              </div>
              <div className="space-y-3 text-xs">
                {[[ "#CD6346", "Pix/digital", `${orders.filter((o) => o.status === "AGUARDANDO_PIX" || o.status === "PAGO").length}` ], [ "#88BBAF", "Delivery", `${orders.filter((o) => o.deliveryType === "ENTREGA").length}` ], [ "#F9E4DD", "Retirada", `${orders.filter((o) => o.deliveryType === "RETIRADA").length}` ], [ "#111111", "Cancelados", `${orders.filter((o) => o.status === "CANCELADO").length}` ]].map(([c, l, v]) => (
                  <div key={l} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: c }} />{l}</span><b>{v}</b></div>
                ))}
              </div>
            </div>
            <div className="mt-5 text-center text-sm">Total: <b>{money(data?.faturamento ?? 0)}</b></div>
          </section>
        </section>
      </div>
    </div>
  );
}
