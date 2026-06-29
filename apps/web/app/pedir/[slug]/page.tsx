"use client";
import { useEffect, useMemo, useState, use } from "react";
import QRCode from "qrcode";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";
async function get(path: string) { const r = await fetch(`${BASE}${path}`); if (!r.ok) throw new Error(await r.text()); return r.json(); }
async function post(path: string, body: any) {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "erro"); return j;
}
const brl = (n: number) => `R$ ${n.toFixed(2)}`;

type Addon = { id: string; name: string; price: number };
type Product = { id: string; name: string; description: string | null; price: number; addons: Addon[]; variations: { id: string; name: string; price: number }[] };
type Category = { id: string; name: string; products: Product[] };
type CartLine = { key: string; product: Product; variationId?: string; addonIds: string[]; quantity: number; notes?: string; unit: number };
const DEMO_MENU: Category[] = [
  {
    id: "demo-lanches",
    name: "Lanches",
    products: [
      { id: "xburger", name: "X-Burger Classico", description: "Pao, carne, queijo, alface e tomate", price: 28, addons: [{ id: "bacon", name: "Bacon", price: 6 }, { id: "cheddar", name: "Cheddar", price: 5 }], variations: [] },
      { id: "xbacon", name: "X-Bacon", description: "Pao, carne, queijo, bacon e molho especial", price: 32, addons: [{ id: "ovo", name: "Ovo", price: 4 }], variations: [] },
      { id: "xsalada", name: "X-Salada", description: "Pao, carne, queijo, salada e maionese", price: 29, addons: [], variations: [] },
    ],
  },
  {
    id: "demo-porcoes",
    name: "Porcoes",
    products: [
      { id: "batata", name: "Batata Frita", description: "Porcao sequinha e crocante", price: 16, addons: [], variations: [] },
    ],
  },
];
const DEMO_ZONES = [{ id: "centro", neighborhood: "Centro", fee: 6 }];

export default function PedirPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string }> }) {
  const { slug } = use(params);
  const { c: token } = use(searchParams);

  const [info, setInfo] = useState<any>({ name: "ZAPYE", isOpen: true });
  const [menu, setMenu] = useState<Category[]>(DEMO_MENU);
  const [zones, setZones] = useState<any[]>(DEMO_ZONES);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"RETIRADA" | "ENTREGA">("ENTREGA");
  const [neighborhood, setNeighborhood] = useState(""); const [street, setStreet] = useState(""); const [number, setNumber] = useState("");
  const [payment, setPayment] = useState<"PIX" | "DINHEIRO" | "CARTAO">("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [placing, setPlacing] = useState(false); const [err, setErr] = useState<string>();
  const [order, setOrder] = useState<any>(null); const [qrImg, setQrImg] = useState<string>();
  const [paid, setPaid] = useState(false);
  const [modal, setModal] = useState<Product | null>(null);
  const [mVar, setMVar] = useState<string>(); const [mAddons, setMAddons] = useState<string[]>([]);
  const [mQty, setMQty] = useState(1); const [mNotes, setMNotes] = useState("");

  useEffect(() => {
    get(`/public/r/${slug}`).then(setInfo).catch(() => {});
    get(`/public/r/${slug}/menu`).then((data) => { if (data.length) setMenu(data); }).catch(() => {});
    get(`/public/r/${slug}/zones`).then((data) => { if (data.length) setZones(data); }).catch(() => {});
    if (token) get(`/public/session/${token}`).then((s) => { if (s.client) { setName(s.client.name ?? ""); setPhone(s.client.phone ?? ""); } }).catch(() => {});
  }, [slug, token]);

  const zoneFee = useMemo(() => zones.find((z) => z.neighborhood === neighborhood)?.fee ?? 0, [zones, neighborhood]);
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unit * l.quantity, 0), [cart]);
  const total = subtotal + (deliveryType === "ENTREGA" ? zoneFee : 0);

  function unitPrice(p: Product, variationId?: string, addonIds: string[] = []) {
    return (variationId ? p.variations.find((v) => v.id === variationId)?.price ?? p.price : p.price)
      + addonIds.reduce((s, id) => s + (p.addons.find((a) => a.id === id)?.price ?? 0), 0);
  }
  function addProduct(p: Product, variationId?: string, addonIds: string[] = [], quantity = 1, notes?: string) {
    setCart((c) => [...c, { key: Math.random().toString(36).slice(2), product: p, variationId, addonIds, quantity, notes, unit: unitPrice(p, variationId, addonIds) }]);
  }
  function openProduct(p: Product) {
    if (p.addons.length === 0 && p.variations.length === 0) { addProduct(p); return; }
    setModal(p); setMVar(p.variations[0]?.id); setMAddons([]); setMQty(1); setMNotes("");
  }
  function confirmModal() {
    if (!modal) return;
    addProduct(modal, mVar, mAddons, mQty, mNotes || undefined);
    setModal(null);
  }
  const toggleAddon = (id: string) => setMAddons((a) => a.includes(id) ? a.filter((x) => x !== id) : [...a, id]);
  const setQty = (key: string, q: number) => setCart((c) => c.flatMap((l) => l.key === key ? (q <= 0 ? [] : [{ ...l, quantity: q }]) : [l]));

  async function place() {
    setErr(undefined); setPlacing(true);
    try {
      const res = await post(`/public/r/${slug}/order`, {
        token, customerName: name, customerPhone: phone,
        items: cart.map((l) => ({ productId: l.product.id, variationId: l.variationId, addonIds: l.addonIds, quantity: l.quantity, notes: l.notes })),
        deliveryType, neighborhood: deliveryType === "ENTREGA" ? neighborhood : undefined,
        street: deliveryType === "ENTREGA" ? street : undefined, number,
        paymentMethod: payment, changeFor: payment === "DINHEIRO" && changeFor ? Number(changeFor) : undefined,
      });
      setOrder(res);
      if (res.pix) {
        setQrImg(await QRCode.toDataURL(res.pix.code, { margin: 1, width: 240 }));
        pollPayment(res.orderId);
      }
    } catch (e: any) { setErr(e.message); }
    setPlacing(false);
  }

  function pollPayment(orderId: string) {
    const t = setInterval(async () => {
      const s = await get(`/public/order/${orderId}/status`);
      if (s.paid) { setPaid(true); clearInterval(t); }
    }, 3000);
  }
  async function simulatePay() {
    if (!order) return;
    await post(`/public/order/${order.orderId}/simulate-payment`, {});
    setPaid(true);
  }

  const inp = "w-full border-0 border-b px-2 py-2 text-sm";

  if (order) {
    return (
      <div className="mx-auto max-w-md p-5">
        <div className="receipt-card p-6 text-center">
          {paid ? (
            <>
              <span className="stamp stamp-green">Pago</span>
              <h1 className="page-title mt-3 text-2xl">Pagamento confirmado!</h1>
              <p className="mt-1 text-sm muted-ink">Pedido #{order.code} enviado para a cozinha.</p>
            </>
          ) : order.pix ? (
            <>
              <span className="stamp stamp-blue">Pix</span>
              <h1 className="page-title mt-3 text-2xl">Pague com Pix</h1>
              <p className="mt-1 text-sm muted-ink">Pedido #{order.code} - <span className="price">{brl(order.total)}</span></p>
              {qrImg && <img src={qrImg} alt="QR Pix" className="mx-auto my-4 rounded-lg bg-white p-2" />}
              <textarea readOnly value={order.pix.code} className="h-20 w-full border-0 border-b p-2 text-xs" />
              <p className="highlight-note mt-3 p-2 text-xs">Pix de TESTE. Clique abaixo para simular o pagamento.</p>
              <button onClick={simulatePay} className="stamp-button mt-3 w-full px-4 py-3 text-sm">
                Ja paguei (simular)
              </button>
            </>
          ) : (
            <>
              <span className="stamp stamp-green">Enviado</span>
              <h1 className="page-title mt-3 text-2xl">Pedido #{order.code} enviado!</h1>
              <p className="mt-1 text-sm muted-ink">
                Total <span className="price">{brl(order.total)}</span> - pagamento na {deliveryType === "ENTREGA" ? "entrega" : "retirada"}.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 pb-56">
      <header className="receipt-card mb-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="brand-wordmark text-4xl">{info?.name ?? "ZAPYE"}<br /><span className="brand-food">Food</span></div>
            <p className="mt-2 text-sm muted-ink">Cardapio digital em papel de restaurante.</p>
          </div>
          <span className={info?.isOpen ? "stamp stamp-green" : "stamp stamp-yellow"}>
            {info ? (info.isOpen ? "Aberto" : "Fechado") : "..."}
          </span>
        </div>
      </header>

      {menu.map((c) => (
        <section key={c.id} className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="page-title text-2xl">{c.name}</h2>
            <div className="h-px flex-1 border-t border-dashed" style={{ borderColor: "var(--border)" }} />
          </div>
          <div className="grid gap-3">
            {c.products.map((p) => (
              <article key={p.id} className="ticket-card flex items-center gap-3 p-3">
                <div className={`food-thumb h-20 w-20 shrink-0 ${p.name.toLowerCase().includes("pizza") ? "pizza" : p.name.toLowerCase().includes("batata") ? "fries" : ""}`} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-black">{p.name}</h3>
                  {p.description && <p className="text-xs muted-ink">{p.description}</p>}
                  <div className="price mt-1 text-lg">{brl(p.price)}</div>
                </div>
                <button onClick={() => openProduct(p)} className="stamp-button h-11 w-11 shrink-0 text-xl">+</button>
              </article>
            ))}
          </div>
        </section>
      ))}

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl border-t p-4" style={{ background: "rgba(245, 230, 211, 0.94)", borderColor: "var(--border)", backdropFilter: "blur(8px)" }}>
          <div className="receipt-card p-4">
            <div className="mb-2 max-h-32 overflow-auto">
              {cart.map((l) => (
                <div key={l.key} className="notebook-line flex items-center justify-between gap-2 py-1 text-sm">
                  <span>{l.product.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(l.key, l.quantity - 1)} className="secondary-button px-2">-</button>
                    <span className="mono-value">{l.quantity}</span>
                    <button onClick={() => setQty(l.key, l.quantity + 1)} className="secondary-button px-2">+</button>
                    <span className="price">{brl(l.unit * l.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input className={inp} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={inp} placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="mt-2 flex gap-2 text-sm">
              {(["ENTREGA", "RETIRADA"] as const).map((t) => (
                <button key={t} onClick={() => setDeliveryType(t)} className={deliveryType === t ? "stamp-button flex-1 py-2" : "secondary-button flex-1 py-2"}>
                  {t === "ENTREGA" ? "Entrega" : "Retirada"}
                </button>
              ))}
            </div>

            {deliveryType === "ENTREGA" && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select className={inp} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                  <option value="">Bairro...</option>
                  {zones.map((z) => <option key={z.id} value={z.neighborhood}>{z.neighborhood} (+{brl(z.fee)})</option>)}
                </select>
                <input className={inp} placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} />
                <input className={inp} placeholder="Numero" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
            )}

            <div className="mt-2 flex gap-2 text-sm">
              {(["PIX", "DINHEIRO", "CARTAO"] as const).map((m) => (
                <button key={m} onClick={() => setPayment(m)} className={payment === m ? "stamp-button flex-1 py-2" : "secondary-button flex-1 py-2"}>
                  {m === "PIX" ? "Pix agora" : m === "DINHEIRO" ? "Dinheiro" : "Cartao"}
                </button>
              ))}
            </div>
            {payment === "DINHEIRO" && (
              <input className={`${inp} mt-2`} placeholder="Troco para quanto? (opcional)" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} />
            )}

            {err && <p className="highlight-note mt-2 p-2 text-xs">{err}</p>}
            <button onClick={place} disabled={placing || !name || !phone} className="stamp-button mt-3 w-full px-4 py-3 text-sm disabled:opacity-50">
              {placing ? "Enviando..." : `Fazer pedido - ${brl(total)}`}
            </button>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" onClick={() => setModal(null)}>
          <div className="receipt-card w-full max-w-md rounded-t-lg p-5 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title text-2xl">{modal.name}</h2>
            {modal.description && <p className="mb-3 text-xs muted-ink">{modal.description}</p>}

            {modal.variations.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs font-bold uppercase muted-ink">Tamanho</div>
                <div className="flex flex-wrap gap-2">
                  {modal.variations.map((v) => (
                    <button key={v.id} onClick={() => setMVar(v.id)} className={mVar === v.id ? "stamp-button px-3 py-2 text-sm" : "secondary-button px-3 py-2 text-sm"}>
                      {v.name} - {brl(v.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal.addons.length > 0 && (
              <div className="mb-3">
                <div className="mb-2 text-xs font-bold uppercase muted-ink">Adicionais</div>
                <div className="grid gap-1.5">
                  {modal.addons.map((a) => (
                    <label key={a.id} className="notebook-line flex cursor-pointer items-center justify-between py-2 text-sm">
                      <span><input type="checkbox" checked={mAddons.includes(a.id)} onChange={() => toggleAddon(a.id)} className="mr-2 align-middle" />{a.name}</span>
                      <span className="price">+{brl(a.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <input value={mNotes} onChange={(e) => setMNotes(e.target.value)} placeholder="Observacao (ex: sem cebola)"
              className="mb-3 w-full border-0 border-b px-2 py-2 text-sm" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setMQty((q) => Math.max(1, q - 1))} className="secondary-button px-3 py-1 text-lg">-</button>
                <span className="mono-value w-6 text-center">{mQty}</span>
                <button onClick={() => setMQty((q) => q + 1)} className="secondary-button px-3 py-1 text-lg">+</button>
              </div>
              <button onClick={confirmModal} className="stamp-button px-5 py-3 text-sm">
                Adicionar - {brl(unitPrice(modal, mVar, mAddons) * mQty)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
