"use client";
import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

type Addon = { id: string; name: string; price: number };
type Product = { id: string; name: string; description: string | null; imageUrl: string | null; basePrice: number; active: boolean; isDaily: boolean; availableDate: string | null; addons: Addon[] };
type Category = { id: string; name: string; products: Product[] };

const brl = (n: number) => `R$ ${Number(n).toFixed(2)}`;
function fallbackImage(name: string) {
  const n = name.toLowerCase();
  if (n.includes("bacon")) return "/food/burger-bacon.png";
  if (n.includes("batata")) return "/food/fries.png";
  if (n.includes("coca") || n.includes("cola")) return "/food/coke.png";
  return "/food/burger-classic.png";
}

export default function CardapioPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [today, setToday] = useState("");
  const [newCat, setNewCat] = useState("");
  const [openAdd, setOpenAdd] = useState<string | null>(null);
  const [expand, setExpand] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

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
  async function deleteProduct(id: string) { await api(`/menu/products/${id}`, { method: "DELETE" }); load(); }
  async function availableToday(id: string) { await api(`/menu/products/${id}/available-today`, { method: "POST" }); load(); }
  async function activateDay() { await api("/menu/day/activate-all", { method: "POST" }); load(); }
  async function clearDay() { await api("/menu/day/clear", { method: "POST" }); load(); }

  const inp = "border-0 border-b px-2 py-1.5 text-sm";

  return (
    <div className="max-w-5xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-3xl">Cardapio</h1>
          <p className="page-intro text-sm">Produtos compactos, com foto, edicao e adicionais.</p>
        </div>
        {today && <span className="stamp stamp-green">Hoje {today}</span>}
      </div>

      {hasDaily && (
        <div className="receipt-card mb-4 flex flex-wrap items-center gap-3 p-3">
          <span className="stamp stamp-yellow">Cardapio do dia</span>
          <span className="text-sm muted-ink">Itens do dia aparecem quando ativados para hoje.</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={activateDay} className="stamp-button px-3 py-2 text-xs">Ativar hoje</button>
            <button onClick={clearDay} className="secondary-button px-3 py-2 text-xs">Limpar</button>
          </div>
        </div>
      )}

      <div className="receipt-card mb-4 flex gap-2 p-3">
        <input className={`${inp} flex-1`} placeholder="Nova categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
        <button onClick={addCategory} className="stamp-button px-4 py-2 text-sm">+ Categoria</button>
      </div>

      {cats.length === 0 && <div className="receipt-card p-5 text-sm muted-ink">Nenhuma categoria ainda. Crie a primeira acima.</div>}

      <div className="space-y-4">
        {cats.map((c) => (
          <section key={c.id} className="receipt-card">
            <div className="receipt-header flex items-center justify-between p-3">
              <h2 className="page-title text-xl">{c.name}</h2>
              <button onClick={() => setOpenAdd(openAdd === c.id ? null : c.id)} className="secondary-button px-3 py-2 text-xs">+ Produto</button>
            </div>

            <div className="p-3">
              {openAdd === c.id && <ProductForm categoryId={c.id} onDone={() => { setOpenAdd(null); load(); }} />}

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {c.products.map((p) => {
                  const availableNow = p.isDaily ? p.availableDate === today : true;
                  return (
                    <article key={p.id} className="ticket-card p-2.5" style={{ opacity: p.active ? 1 : 0.62 }}>
                      {editing === p.id ? (
                        <ProductForm product={p} categoryId={c.id} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
                      ) : (
                        <>
                          <div className="flex items-start gap-2.5">
                            <img src={p.imageUrl || fallbackImage(p.name)} alt={p.name} className="h-14 w-14 shrink-0 rounded-full object-cover shadow-[0_4px_12px_rgba(17,17,17,.12)]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 text-sm font-black leading-tight">{p.name}</h3>
                                <div className="flex shrink-0 gap-1">
                                  <button onClick={() => setEditing(p.id)} className="secondary-button grid h-8 w-8 place-items-center p-0" aria-label={`Editar ${p.name}`}><Pencil size={14} /></button>
                                  <button onClick={() => deleteProduct(p.id)} className="secondary-button grid h-8 w-8 place-items-center p-0 text-[#CD6346]" aria-label={`Excluir ${p.name}`}><Trash2 size={14} /></button>
                                </div>
                              </div>
                              {p.description && <p className="mt-1 line-clamp-2 text-[11px] leading-snug muted-ink">{p.description}</p>}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="price text-base">{brl(p.basePrice)}</span>
                                {p.isDaily && <span className={`stamp ${availableNow ? "stamp-green" : "stamp-yellow"}`}>{availableNow ? "Hoje" : "Do dia"}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="receipt-divider mt-2 flex flex-wrap items-center gap-3 pt-2 text-[11px]">
                            <button onClick={() => patchProduct(p.id, { active: !p.active })} className={p.active ? "stamp stamp-green" : "stamp stamp-red"}>
                              {p.active ? "Ativo" : "Inativo"}
                            </button>
                            <button onClick={() => patchProduct(p.id, { isDaily: !p.isDaily })} className="font-bold" style={{ color: p.isDaily ? "var(--accent-dark)" : "var(--muted)" }}>
                              {p.isDaily ? "Item do dia" : "tornar do dia"}
                            </button>
                            {p.isDaily && !availableNow && <button onClick={() => availableToday(p.id)} className="font-bold" style={{ color: "var(--accent-dark)" }}>Disponibilizar hoje</button>}
                            <button onClick={() => setExpand(expand === p.id ? null : p.id)} className="ml-auto font-bold muted-ink">
                              {p.addons.length} adicional(is)
                            </button>
                          </div>

                          {expand === p.id && <Addons product={p} onChange={load} />}
                        </>
                      )}
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

function ProductForm({ categoryId, product, onDone, onCancel }: { categoryId: string; product?: Product; onDone: () => void; onCancel?: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(Number(product.basePrice)) : "");
  const [desc, setDesc] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const inp = "border-0 border-b px-2 py-1.5 text-sm";
  async function save() {
    if (!name || !price) return;
    const body = { categoryId, name, basePrice: Number(price), description: desc || undefined, imageUrl: imageUrl || undefined };
    if (product) await api(`/menu/products/${product.id}`, { method: "PATCH", body: JSON.stringify(body) });
    else await api("/menu/products", { method: "POST", body: JSON.stringify(body) });
    onDone();
  }
  return (
    <div className="grid gap-2">
      <div className="flex items-start gap-2">
        <img src={imageUrl || fallbackImage(name)} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover shadow-[0_4px_12px_rgba(17,17,17,.12)]" />
        <div className="grid flex-1 gap-2">
          <div className="flex gap-2">
            <input className={`${inp} flex-1`} placeholder="Nome do produto" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={`${inp} w-24`} type="number" step="0.01" placeholder="Preco" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <input className={inp} placeholder="URL da foto" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className={inp} placeholder="Descricao" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <button onClick={onCancel} className="secondary-button px-3 py-2 text-xs">Cancelar</button>}
        <button onClick={save} className="stamp-button px-4 py-2 text-xs">{product ? "Salvar edicao" : "Salvar produto"}</button>
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
    <div className="receipt-divider mt-2 pt-2">
      {product.addons.map((a) => (
        <div key={a.id} className="notebook-line flex items-center justify-between py-1 text-xs">
          <span>{a.name} <span className="price">+{brl(a.price)}</span></span>
          <button onClick={() => remove(a.id)} className="font-bold" style={{ color: "var(--danger)" }}>remover</button>
        </div>
      ))}
      <div className="mt-2 flex gap-2">
        <input className={`${inp} flex-1`} placeholder="Adicional" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inp} w-20`} type="number" step="0.01" placeholder="R$" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button onClick={add} className="stamp-button px-3 py-1.5 text-sm">+</button>
      </div>
    </div>
  );
}
