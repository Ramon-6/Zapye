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

export default function PedirPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ c?: string }> }) {
  const { slug } = use(params);
  const { c: token } = use(searchParams);

  const [info, setInfo] = useState<any>(null);
  const [menu, setMenu] = useState<Category[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"RETIRADA" | "ENTREGA">("ENTREGA");
  const [neighborhood, setNeighborhood] = useState(""); const [street, setStreet] = useState(""); const [number, setNumber] = useState("");
  const [payment, setPayment] = useState<"PIX" | "DINHEIRO" | "CARTAO">("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [placing, setPlacing] = useState(false); const [err, setErr] = useState<string>();
  const [order, setOrder] = useState<any>(null); const [qrImg, setQrImg] = useState<string>();
  const [paid, setPaid] = useState(false);
  // modal de produto (variações + adicionais + obs)
  const [modal, setModal] = useState<Product | null>(null);
  const [mVar, setMVar] = useState<string>(); const [mAddons, setMAddons] = useState<string[]>([]);
  const [mQty, setMQty] = useState(1); const [mNotes, setMNotes] = useState("");

  useEffect(() => {
    get(`/public/r/${slug}`).then(setInfo).catch(() => {});
    get(`/public/r/${slug}/menu`).then(setMenu).catch(() => {});
    get(`/public/r/${slug}/zones`).then(setZones).catch(() => {});
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
  // abre modal se houver opções; senão adiciona direto
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

  const card = { borderColor: "var(--border)", background: "var(--surface)" };
  const inp = "w-full rounded-lg border bg-transparent px-3 py-2 text-sm"; const inpS = { borderColor: "var(--border)" };

  // ---- Tela de confirmação / pagamento ----
  if (order) {
    return (
      <div className="mx-auto max-w-md p-5">
        <div className="rounded-2xl border p-6 text-center" style={card}>
          {paid ? (
            <>
              <div className="text-4xl">✅</div>
              <h1 className="mt-2 text-xl font-bold">Pagamento confirmado!</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Pedido #{order.code} enviado para a cozinha.</p>
            </>
          ) : order.pix ? (
            <>
              <h1 className="text-xl font-bold">Pague com Pix</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Pedido #{order.code} · {brl(order.total)}</p>
              {qrImg && <img src={qrImg} alt="QR Pix" className="mx-auto my-4 rounded-lg bg-white p-2" />}
              <textarea readOnly value={order.pix.code} className="h-20 w-full rounded-lg border bg-transparent p-2 text-xs" style={inpS} />
              <p className="mt-2 text-xs" style={{ color: "var(--accent-warn)" }}>Pix de TESTE (virtual). Clique abaixo para simular o pagamento.</p>
              <button onClick={simulatePay} className="mt-3 w-full rounded-lg py-3 font-semibold text-black" style={{ background: "var(--accent)" }}>
                Já paguei (simular)
              </button>
            </>
          ) : (
            <>
              <div className="text-4xl">🧾</div>
              <h1 className="mt-2 text-xl font-bold">Pedido #{order.code} enviado!</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Total {brl(order.total)} · pagamento na {deliveryType === "ENTREGA" ? "entrega" : "retirada"}.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Cardápio + carrinho ----
  return (
    <div className="mx-auto max-w-2xl p-4 pb-40">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{info?.name ?? "Cardápio"}</h1>
        <p className="text-sm" style={{ color: info?.isOpen ? "var(--accent)" : "var(--accent-warn)" }}>
          {info ? (info.isOpen ? "● Aberto agora" : "● Fechado no momento") : "…"}
        </p>
      </div>

      {menu.map((c) => (
        <section key={c.id} className="mb-5">
          <h2 className="mb-2 text-lg font-semibold">{c.name}</h2>
          <div className="grid gap-2">
            {c.products.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border p-3" style={card}>
                <div className="pr-2">
                  <div className="font-semibold">{p.name}</div>
                  {p.description && <div className="text-xs" style={{ color: "var(--muted)" }}>{p.description}</div>}
                  <div className="mt-1 text-sm" style={{ color: "var(--accent)" }}>{brl(p.price)}</div>
                </div>
                <button onClick={() => openProduct(p)} className="rounded-lg px-3 py-2 text-sm font-bold text-black" style={{ background: "var(--accent)" }}>+</button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Carrinho + checkout fixo embaixo */}
      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t p-4" style={{ ...card, borderColor: "var(--border)" }}>
          <div className="mb-2 max-h-32 overflow-auto">
            {cart.map((l) => (
              <div key={l.key} className="flex items-center justify-between py-1 text-sm">
                <span>{l.product.name}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(l.key, l.quantity - 1)} className="px-2">−</button>
                  <span>{l.quantity}</span>
                  <button onClick={() => setQty(l.key, l.quantity + 1)} className="px-2">+</button>
                  <span style={{ color: "var(--accent)" }}>{brl(l.unit * l.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input className={inp} style={inpS} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            <input className={inp} style={inpS} placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="mt-2 flex gap-2 text-sm">
            {(["ENTREGA", "RETIRADA"] as const).map((t) => (
              <button key={t} onClick={() => setDeliveryType(t)} className="flex-1 rounded-lg border py-2"
                style={{ borderColor: "var(--border)", background: deliveryType === t ? "var(--accent)" : "transparent", color: deliveryType === t ? "#000" : "var(--text)" }}>
                {t === "ENTREGA" ? "Entrega" : "Retirada"}
              </button>
            ))}
          </div>

          {deliveryType === "ENTREGA" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select className={inp} style={inpS} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                <option value="">Bairro…</option>
                {zones.map((z) => <option key={z.id} value={z.neighborhood}>{z.neighborhood} (+{brl(z.fee)})</option>)}
              </select>
              <input className={inp} style={inpS} placeholder="Rua" value={street} onChange={(e) => setStreet(e.target.value)} />
              <input className={inp} style={inpS} placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
          )}

          <div className="mt-2 flex gap-2 text-sm">
            {(["PIX", "DINHEIRO", "CARTAO"] as const).map((m) => (
              <button key={m} onClick={() => setPayment(m)} className="flex-1 rounded-lg border py-2"
                style={{ borderColor: "var(--border)", background: payment === m ? "var(--accent)" : "transparent", color: payment === m ? "#000" : "var(--text)" }}>
                {m === "PIX" ? "Pix agora" : m === "DINHEIRO" ? "Dinheiro" : "Cartão"}
              </button>
            ))}
          </div>
          {payment === "DINHEIRO" && (
            <input className={`${inp} mt-2`} style={inpS} placeholder="Troco para quanto? (opcional)" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} />
          )}

          {err && <p className="mt-2 text-xs" style={{ color: "var(--accent-warn)" }}>{err}</p>}
          <button onClick={place} disabled={placing || !name || !phone} className="mt-3 w-full rounded-lg py-3 font-bold text-black disabled:opacity-50" style={{ background: "var(--accent)" }}>
            {placing ? "Enviando…" : `Fazer pedido · ${brl(total)}`}
          </button>
        </div>
      )}

      {/* Modal de produto: variações + adicionais + observação */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-t-2xl border p-5 sm:rounded-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-lg font-bold">{modal.name}</div>
            {modal.description && <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>{modal.description}</p>}

            {modal.variations.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>Tamanho</div>
                <div className="flex flex-wrap gap-2">
                  {modal.variations.map((v) => (
                    <button key={v.id} onClick={() => setMVar(v.id)} className="rounded-lg border px-3 py-1.5 text-sm"
                      style={{ borderColor: "var(--border)", background: mVar === v.id ? "var(--accent)" : "transparent", color: mVar === v.id ? "#000" : "var(--text)" }}>
                      {v.name} · {brl(v.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal.addons.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 text-xs font-semibold" style={{ color: "var(--muted)" }}>Adicionais</div>
                <div className="grid gap-1.5">
                  {modal.addons.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                      <span><input type="checkbox" checked={mAddons.includes(a.id)} onChange={() => toggleAddon(a.id)} className="mr-2 align-middle" />{a.name}</span>
                      <span style={{ color: "var(--accent)" }}>+{brl(a.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <input value={mNotes} onChange={(e) => setMNotes(e.target.value)} placeholder="Observação (ex: sem cebola)"
              className="mb-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setMQty((q) => Math.max(1, q - 1))} className="rounded-lg border px-3 py-1 text-lg" style={{ borderColor: "var(--border)" }}>−</button>
                <span className="w-6 text-center font-semibold">{mQty}</span>
                <button onClick={() => setMQty((q) => q + 1)} className="rounded-lg border px-3 py-1 text-lg" style={{ borderColor: "var(--border)" }}>+</button>
              </div>
              <button onClick={confirmModal} className="rounded-lg px-5 py-2.5 font-bold text-black" style={{ background: "var(--accent)" }}>
                Adicionar · {brl(unitPrice(modal, mVar, mAddons) * mQty)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
