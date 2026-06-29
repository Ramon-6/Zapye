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
  const [openAdd, setOpenAdd] = useState<string | null>(null);
  const [expand, setExpand] = useState<string | null>(null);

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

  const inp = "border-0 border-b px-2 py-2 text-sm";

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-3xl">Cardapio</h1>
          <p className="page-intro text-sm">Categorias como separadores e produtos como fichas de receita.</p>
        </div>
        {today && <span className="stamp stamp-green">Hoje {today}</span>}
      </div>

      {hasDaily && (
        <div className="receipt-card mb-5 flex flex-wrap items-center gap-3 p-4">
          <span className="stamp stamp-yellow">Cardapio do dia</span>
          <span className="text-sm muted-ink">Itens do dia aparecem quando ativados para hoje.</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={activateDay} className="stamp-button px-3 py-2 text-xs">Ativar hoje</button>
            <button onClick={clearDay} className="secondary-button px-3 py-2 text-xs">Limpar</button>
          </div>
        </div>
      )}

      <div className="receipt-card mb-6 flex gap-2 p-4">
        <input className={`${inp} flex-1`} placeholder="Nova categoria (ex: Lanches, Bebidas, Pratos do dia)" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
        <button onClick={addCategory} className="stamp-button px-4 py-2 text-sm">+ Categoria</button>
      </div>

      {cats.length === 0 && <div className="receipt-card p-5 text-sm muted-ink">Nenhuma categoria ainda. Crie a primeira acima.</div>}

      <div className="space-y-6">
        {cats.map((c) => (
          <section key={c.id} className="receipt-card">
            <div className="receipt-header flex items-center justify-between p-4">
              <h2 className="page-title text-xl">{c.name}</h2>
              <button onClick={() => setOpenAdd(openAdd === c.id ? null : c.id)} className="secondary-button px-3 py-2 text-xs">+ Produto</button>
            </div>

            <div className="p-4">
              {openAdd === c.id && <ProductForm categoryId={c.id} onDone={() => { setOpenAdd(null); load(); }} />}

              <div className="grid gap-3 md:grid-cols-2">
                {c.products.map((p) => {
                  const availableNow = p.isDaily ? p.availableDate === today : true;
                  return (
                    <article key={p.id} className="ticket-card p-3">
                      <div className="flex items-start gap-3">
                        <div className="food-thumb h-20 w-20 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black">{p.name}</h3>
                            {p.isDaily && <span className={`stamp ${availableNow ? "stamp-green" : "stamp-yellow"}`}>{availableNow ? "Hoje" : "Do dia"}</span>}
                          </div>
                          {p.description && <p className="mt-1 text-xs muted-ink">{p.description}</p>}
                          <div className="price mt-2 text-lg">{brl(p.basePrice)}</div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <button onClick={() => patchProduct(p.id, { active: !p.active })} className={p.active ? "stamp stamp-green" : "stamp stamp-red"}>
                            {p.active ? "Ativo" : "Inativo"}
                          </button>
                          <button onClick={() => patchProduct(p.id, { isDaily: !p.isDaily })} className="text-[11px] font-bold" style={{ color: p.isDaily ? "var(--accent-dark)" : "var(--muted)" }}>
                            {p.isDaily ? "Item do dia" : "tornar do dia"}
                          </button>
                        </div>
                      </div>

                      <div className="receipt-divider mt-3 flex flex-wrap gap-3 pt-3 text-xs">
                        {p.isDaily && !availableNow && <button onClick={() => availableToday(p.id)} className="font-bold" style={{ color: "var(--accent-dark)" }}>Disponibilizar hoje</button>}
                        <button onClick={() => setExpand(expand === p.id ? null : p.id)} className="font-bold muted-ink">
                          {p.addons.length} adicional(is) {expand === p.id ? "▲" : "▼"}
                        </button>
                      </div>

                      {expand === p.id && <Addons product={p} onChange={load} />}
                    </article>
                  );
                })}
                {c.products.length === 0 && <p className="text-xs muted-ink">Sem produtos nesta categoria.</p>}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ProductForm({ categoryId, onDone }: { categoryId: string; onDone: () => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [desc, setDesc] = useState("");
  const inp = "border-0 border-b px-2 py-2 text-sm";
  async function save() {
    if (!name || !price) return;
    await api("/menu/products", { method: "POST", body: JSON.stringify({ categoryId, name, basePrice: Number(price), description: desc || undefined }) });
    onDone();
  }
  return (
    <div className="ticket-card mb-3 grid gap-2 p-3">
      <div className="flex gap-2">
        <input className={`${inp} flex-1`} placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inp} w-28`} type="number" step="0.01" placeholder="Preco" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <input className={inp} placeholder="Descricao (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex justify-end">
        <button onClick={save} className="stamp-button px-4 py-2 text-sm">Salvar produto</button>
      </div>
    </div>
  );
}

function Addons({ product, onChange }: { product: Product; onChange: () => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState("");
  const inp = "border-0 border-b px-2 py-1.5 text-sm";
  async function add() {
    if (!name) return;
    await api(`/menu/products/${product.id}/addons`, { method: "POST", body: JSON.stringify({ name, price: Number(price || 0) }) });
    setName(""); setPrice(""); onChange();
  }
  async function remove(id: string) { await api(`/menu/addons/${id}`, { method: "DELETE" }); onChange(); }
  return (
    <div className="receipt-divider mt-3 pt-3">
      {product.addons.map((a) => (
        <div key={a.id} className="notebook-line flex items-center justify-between py-1 text-sm">
          <span>{a.name} <span className="price">+{brl(a.price)}</span></span>
          <button onClick={() => remove(a.id)} className="text-xs font-bold" style={{ color: "var(--danger)" }}>remover</button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <input className={`${inp} flex-1`} placeholder="Adicional (ex: Bacon)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inp} w-20`} type="number" step="0.01" placeholder="R$" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button onClick={add} className="stamp-button px-3 py-1.5 text-sm">+</button>
      </div>
    </div>
  );
}
