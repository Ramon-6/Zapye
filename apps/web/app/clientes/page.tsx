"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Client = { id: string; name: string | null; phone: string; tags: string[]; ordersCount: number; totalSpent: number };
const brl = (n: number) => `R$ ${n.toFixed(2)}`;

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [newTag, setNewTag] = useState<Record<string, string>>({});

  const load = useCallback(() => { api<Client[]>("/clients").then(setClients).catch(() => {}); }, []);
  useEffect(() => load(), [load]);

  async function saveTags(c: Client, tags: string[]) {
    await api(`/clients/${c.id}/tags`, { method: "PATCH", body: JSON.stringify({ tags }) });
    load();
  }
  const addTag = (c: Client) => {
    const t = (newTag[c.id] ?? "").trim();
    if (t && !c.tags.includes(t)) saveTags(c, [...c.tags, t]);
    setNewTag((s) => ({ ...s, [c.id]: "" }));
  };
  const removeTag = (c: Client, t: string) => saveTags(c, c.tags.filter((x) => x !== t));

  const filtered = clients.filter((c) =>
    (c.name ?? "").toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q));

  return (
    <div className="max-w-5xl">
      <h1 className="page-title text-3xl">Clientes</h1>
      <p className="page-intro mb-4 text-sm">{clients.length} cliente(s) registrados no caderno.</p>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone"
        className="mb-4 w-full max-w-xl border-0 border-b px-2 py-2 text-sm" />

      <div className="receipt-card overflow-hidden">
        <div className="receipt-header hidden grid-cols-[1.4fr_1fr_.7fr_.8fr_1fr] gap-3 p-3 text-xs font-black uppercase muted-ink md:grid">
          <span>Nome</span><span>Telefone</span><span>Pedidos</span><span>Total gasto</span><span>Tags</span>
        </div>
        {filtered.length === 0 && <p className="p-4 text-sm muted-ink">Nenhum cliente.</p>}
        {filtered.map((c) => (
          <div key={c.id} className="notebook-line grid gap-3 p-3 text-sm md:grid-cols-[1.4fr_1fr_.7fr_.8fr_1fr] md:items-center">
            <div>
              <div className="font-black">{c.name ?? "Sem nome"}</div>
              <div className="text-xs muted-ink md:hidden">{c.phone}</div>
            </div>
            <div className="hidden muted-ink md:block">{c.phone}</div>
            <div className="mono-value">{c.ordersCount}</div>
            <div className="price">{brl(c.totalSpent)}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {c.tags.map((t, idx) => (
                <span key={t} className={`stamp ${idx % 2 ? "stamp-yellow" : "stamp-blue"}`}>
                  {t} <button onClick={() => removeTag(c, t)} className="ml-1 opacity-60 hover:opacity-100">x</button>
                </span>
              ))}
              <input value={newTag[c.id] ?? ""} onChange={(e) => setNewTag((s) => ({ ...s, [c.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addTag(c)} placeholder="+ tag"
                className="w-24 border-0 border-b px-2 py-1 text-xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
