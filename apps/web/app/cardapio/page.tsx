"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/api";

type Addon = { id: string; name: string; price: number };
type Product = { id: string; name: string; description: string | null; basePrice: number; active: boolean; isDaily: boolean; availableDate: string | null; addons: Addon[] };
type Category = { id: string; name: string; products: Product[] };

const brl = (n: number) => `R$ ${Number(n).toFixed(2)}`;

export default function CardapioPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [today, setToday] = useState("");
  const [newCat, setNewCat] = useState("");
  const [openAdd, setOpenAdd] = useState<string | null>(null); // categoryId com form de produto aberto
  const [expand, setExpand] = useState<string | null>(null);    // produto com adicionais abertos

  const load = useCallback(() => {
    api<Category[]>("/menu/categories").then(setCats).catch(() => {});
    api<{ today: string }>("/menu/today").then((r) => setToday(r.today)).catch(() => {});
  }, []);
  useEffect(() => load(), [load]);

  const hasDaily = cats.some((c) => c.products.some((p) => p.isDaily));

  async function addCategory() {
    if (!newCat.trim()) return;
    await api("/menu/categories", { method: "POST", body: JSON.stringify({ name: newCat.trim() }) });
    setNewCat(""); load();
  }
  async function patchProduct(id: string, data: any) { await api(`/menu/products/${id}`, { method: "PATCH", body: JSON.stringify(data) }); load(); }
  async function availableToday(id: string) { await api(`/menu/products/${id}/available-today`, { method: "POST" }); load(); }
  async function activateDay() { await api("/menu/day/activate-all", { method: "POST" }); load(); }
  async function clearDay() { await api("/menu/day/clear", { method: "POST" }); load(); }

  const inp = "rounded-lg border bg-transparent px-3 py-2 text-sm"; const inpS = { borderColor: "var(--border)" };
  const card = { borderColor: "var(--border)", background: "var(--surface)" };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold">Cardápio</h1>
      <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>Itens fixos ficam sempre disponíveis. Itens do dia só aparecem quando ativados para hoje.</p>

      {hasDaily && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border p-3" style={card}>
          <span className="text-sm font-semibold">🍲 Cardápio do dia</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>(hoje: {today})</span>
          <div className="ml-auto flex gap-2">
            <button onClick={activateDay} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-black" style={{ background: "var(--accent)" }}>Ativar itens do dia para hoje</button>
            <button onClick={clearDay} className="rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--border)", color: "var(--accent-warn)" }}>Limpar</button>
          </div>
        </div>
      )}

      {/* Nova categoria */}
      <div className="mb-5 flex gap-2">
        <input className={`${inp} flex-1`} style={inpS} placeholder="Nova categoria (ex: Lanches, Bebidas, Pratos do dia)" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
        <button onClick={addCategory} className="rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>+ Categoria</button>
      </div>

      {cats.length === 0 && <p style={{ color: "var(--muted)" }}>Nenhuma categoria ainda. Crie a primeira acima.</p>}

      {cats.map((c) => (
        <section key={c.id} className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{c.name}</h2>
            <button onClick={() => setOpenAdd(openAdd === c.id ? null : c.id)} className="text-xs" style={{ color: "var(--accent)" }}>+ Produto</button>
          </div>

          {openAdd === c.id && <ProductForm categoryId={c.id} onDone={() => { setOpenAdd(null); load(); }} />}

          <div className="grid gap-2">
            {c.products.map((p) => {
              const availableNow = p.isDaily ? p.availableDate === today : true;
              return (
                <div key={p.id} className="rounded-xl border p-3" style={card}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">
                        {p.name}
                        {p.isDaily && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px]" style={{ background: availableNow ? "var(--accent)" : "var(--border)", color: availableNow ? "#000" : "var(--muted)" }}>{availableNow ? "Hoje" : "Do dia"}</span>}
                      </div>
                      {p.description && <div className="text-xs" style={{ color: "var(--muted)" }}>{p.description}</div>}
                      <div className="mt-1 text-sm" style={{ color: "var(--accent)" }}>{brl(p.basePrice)}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <button onClick={() => patchProduct(p.id, { active: !p.active })} className="rounded-lg px-3 py-1 text-xs font-semibold" style={{ background: p.active ? "var(--accent)" : "var(--border)", color: p.active ? "#000" : "var(--muted)" }}>{p.active ? "Ativo" : "Inativo"}</button>
                      <button onClick={() => patchProduct(p.id, { isDaily: !p.isDaily })} className="text-[11px]" style={{ color: p.isDaily ? "var(--accent)" : "var(--muted)" }}>{p.isDaily ? "✓ Item do dia" : "tornar item do dia"}</button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {p.isDaily && !availableNow && <button onClick={() => availableToday(p.id)} style={{ color: "var(--accent)" }}>Disponibilizar hoje</button>}
                    <button onClick={() => setExpand(expand === p.id ? null : p.id)} style={{ color: "var(--muted)" }}>
                      {p.addons.length} adicional(is) {expand === p.id ? "▲" : "▼"}
                    </button>
                  </div>

                  {expand === p.id && <Addons product={p} onChange={load} />}
                </div>
              );
            })}
            {c.products.length === 0 && <p className="text-xs" style={{ color: "var(--muted)" }}>Sem produtos nesta categoria.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProductForm({ categoryId, onDone }: { categoryId: string; onDone: () => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [desc, setDesc] = useState(""); const [daily, setDaily] = useState(false);
  const inp = "rounded-lg border bg-transparent px-3 py-2 text-sm"; const inpS = { borderColor: "var(--border)" };
  async function save() {
    if (!name || !price) return;
    await api("/menu/products", { method: "POST", body: JSON.stringify({ categoryId, name, basePrice: Number(price), description: desc || undefined }) });
    onDone();
  }
  return (
    <div className="mb-2 grid gap-2 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex gap-2">
        <input className={`${inp} flex-1`} style={inpS} placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inp} w-28`} style={inpS} type="number" step="0.01" placeholder="Preço" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <input className={inp} style={inpS} placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex items-center justify-end gap-2">
        <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>Salvar produto</button>
      </div>
    </div>
  );
}

function Addons({ product, onChange }: { product: Product; onChange: () => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState("");
  const inp = "rounded-lg border bg-transparent px-2 py-1.5 text-sm"; const inpS = { borderColor: "var(--border)" };
  async function add() {
    if (!name) return;
    await api(`/menu/products/${product.id}/addons`, { method: "POST", body: JSON.stringify({ name, price: Number(price || 0) }) });
    setName(""); setPrice(""); onChange();
  }
  async function remove(id: string) { await api(`/menu/addons/${id}`, { method: "DELETE" }); onChange(); }
  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
      {product.addons.map((a) => (
        <div key={a.id} className="flex items-center justify-between py-1 text-sm">
          <span>{a.name} <span style={{ color: "var(--accent)" }}>+{brl(a.price)}</span></span>
          <button onClick={() => remove(a.id)} className="text-xs" style={{ color: "var(--accent-warn)" }}>remover</button>
        </div>
      ))}
      <div className="mt-1 flex gap-2">
        <input className={`${inp} flex-1`} style={inpS} placeholder="Adicional (ex: Bacon)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inp} w-20`} style={inpS} type="number" step="0.01" placeholder="R$" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button onClick={add} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>+</button>
      </div>
    </div>
  );
}
