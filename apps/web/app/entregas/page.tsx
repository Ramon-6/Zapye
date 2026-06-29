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

  return (
    <div className="max-w-5xl">
      <h1 className="page-title text-3xl">Entregas</h1>
      <p className="page-intro mb-5 text-sm">Bairros atendidos em tickets de entrega.</p>

      <form onSubmit={addZone} className="receipt-card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-48 flex-1 text-xs font-bold uppercase muted-ink">
          Bairro
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}
            className="mt-1 w-full border-0 border-b px-2 py-2 text-sm" placeholder="Centro" />
        </label>
        <label className="w-28 text-xs font-bold uppercase muted-ink">
          Taxa R$
          <input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.01"
            className="mt-1 w-full border-0 border-b px-2 py-2 text-sm" placeholder="5,00" />
        </label>
        <label className="w-32 text-xs font-bold uppercase muted-ink">
          Pedido min.
          <input value={minOrder} onChange={(e) => setMinOrder(e.target.value)} type="number" step="0.01"
            className="mt-1 w-full border-0 border-b px-2 py-2 text-sm" placeholder="0,00" />
        </label>
        <button className="stamp-button px-4 py-2 text-sm">Adicionar</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {zones.length === 0 && <div className="receipt-card p-4 text-sm muted-ink">Nenhum bairro cadastrado.</div>}
        {zones.map((z) => (
          <article key={z.id} className="ticket-card p-4" style={{ opacity: z.active ? 1 : 0.58 }}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="page-title text-xl">{z.neighborhood}</h2>
                <p className="text-xs muted-ink">Ticket de entrega</p>
              </div>
              <button onClick={() => toggle(z)} className={z.active ? "stamp stamp-green" : "stamp stamp-red"}>
                {z.active ? "Ativo" : "Inativo"}
              </button>
            </div>
            <div className="receipt-divider flex justify-between pt-3 text-sm">
              <span className="muted-ink">Taxa</span>
              <span className="price">R$ {Number(z.fee).toFixed(2)}</span>
            </div>
            {Number(z.minOrder) > 0 && (
              <div className="flex justify-between pt-2 text-sm">
                <span className="muted-ink">Pedido min.</span>
                <span className="price">R$ {Number(z.minOrder).toFixed(2)}</span>
              </div>
            )}
            <button onClick={() => remove(z)} className="mt-4 text-xs font-bold" style={{ color: "var(--danger)" }}>Remover</button>
          </article>
        ))}
      </div>
    </div>
  );
}
