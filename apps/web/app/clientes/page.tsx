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
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Clientes</h1>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>{clients.length} cliente(s).</p>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou telefone"
        className="mb-4 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />

      <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {filtered.length === 0 && <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>Nenhum cliente.</p>}
        {filtered.map((c) => (
          <div key={c.id} className="border-b p-3 last:border-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.name ?? "Sem nome"}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{c.phone}</div>
              </div>
              <div className="text-right text-xs" style={{ color: "var(--muted)" }}>
                {c.ordersCount} pedido(s) · <b style={{ color: "var(--accent)" }}>{brl(c.totalSpent)}</b>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--border)" }}>
                  {t} <button onClick={() => removeTag(c, t)} className="opacity-60 hover:opacity-100">✕</button>
                </span>
              ))}
              <input value={newTag[c.id] ?? ""} onChange={(e) => setNewTag((s) => ({ ...s, [c.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addTag(c)} placeholder="+ tag"
                className="w-20 rounded-full border bg-transparent px-2 py-0.5 text-xs" style={{ borderColor: "var(--border)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
