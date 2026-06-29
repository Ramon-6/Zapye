"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Zone = { id: string; neighborhood: string; fee: number; minOrder: number; avgMinutes: number | null; active: boolean };

export default function EntregasPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [fee, setFee] = useState("");
  const [minOrder, setMinOrder] = useState("");

  const load = useCallback(() => {
    api<Zone[]>("/delivery-zones").then(setZones).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  async function addZone(e: React.FormEvent) {
    e.preventDefault();
    if (!neighborhood || !fee) return;
    await api("/delivery-zones", {
      method: "POST",
      body: JSON.stringify({ neighborhood, fee: Number(fee), minOrder: Number(minOrder || 0) }),
    });
    setNeighborhood(""); setFee(""); setMinOrder(""); load();
  }

  async function toggle(z: Zone) {
    await api(`/delivery-zones/${z.id}`, { method: "PATCH", body: JSON.stringify({ active: !z.active }) });
    load();
  }

  async function remove(z: Zone) {
    await api(`/delivery-zones/${z.id}`, { method: "DELETE" });
    load();
  }

  const input = { borderColor: "var(--border)" };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Entregas</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>Bairros atendidos e taxa de entrega.</p>

      <form onSubmit={addZone} className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex-1">
          <label className="text-xs" style={{ color: "var(--muted)" }}>Bairro</label>
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={input} placeholder="Centro" />
        </div>
        <div className="w-24">
          <label className="text-xs" style={{ color: "var(--muted)" }}>Taxa R$</label>
          <input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.01"
            className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={input} placeholder="5,00" />
        </div>
        <div className="w-28">
          <label className="text-xs" style={{ color: "var(--muted)" }}>Pedido mín.</label>
          <input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} type="number" step="0.01"
            className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={input} placeholder="0,00" />
        </div>
        <button className="rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>
          Adicionar
        </button>
      </form>

      <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {zones.length === 0 && <p className="p-4 text-sm" style={{ color: "var(--muted)" }}>Nenhum bairro cadastrado.</p>}
        {zones.map((z) => (
          <div key={z.id} className="flex items-center justify-between border-b p-3 last:border-0" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="font-semibold" style={{ opacity: z.active ? 1 : 0.5 }}>{z.neighborhood}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                Taxa R$ {Number(z.fee).toFixed(2)}{Number(z.minOrder) > 0 && ` · mín. R$ ${Number(z.minOrder).toFixed(2)}`}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(z)} className="rounded-lg px-3 py-1 text-xs font-semibold"
                style={{ background: z.active ? "var(--accent)" : "var(--border)", color: z.active ? "#000" : "var(--muted)" }}>
                {z.active ? "Ativo" : "Inativo"}
              </button>
              <button onClick={() => remove(z)} className="text-xs" style={{ color: "var(--accent-warn)" }}>Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
