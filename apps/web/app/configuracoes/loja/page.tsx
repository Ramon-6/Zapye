"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Settings = {
  addressLine?: string; pixKey?: string; pixKeyName?: string;
  avgDeliveryMin?: number; minOrderValue?: number;
  greetingMessage?: string; closingMessage?: string; deliveryPolicy?: string;
  acceptsPix?: boolean; acceptsCash?: boolean; acceptsCard?: boolean; acceptsPickup?: boolean;
};

export default function LojaPage() {
  const [s, setS] = useState<Settings>({});
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ settings: Settings }>("/settings")
      .then((r) => setS({ ...r.settings, minOrderValue: Number(r.settings?.minOrderValue ?? 0) }))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Settings, v: any) => { setS((p) => ({ ...p, [k]: v })); setSaved(false); };

  async function save() {
    await api("/settings", {
      method: "PATCH",
      body: JSON.stringify({
        addressLine: s.addressLine, pixKey: s.pixKey, pixKeyName: s.pixKeyName,
        avgDeliveryMin: Number(s.avgDeliveryMin) || undefined, minOrderValue: Number(s.minOrderValue) || 0,
        greetingMessage: s.greetingMessage, closingMessage: s.closingMessage, deliveryPolicy: s.deliveryPolicy,
        acceptsPix: !!s.acceptsPix, acceptsCash: !!s.acceptsCash, acceptsCard: !!s.acceptsCard, acceptsPickup: !!s.acceptsPickup,
      }),
    });
    setSaved(true);
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>Carregando…</p>;

  const inp = "w-full rounded-lg border bg-transparent px-3 py-2 text-sm";
  const inpS = { borderColor: "var(--border)" };
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3"><label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>{label}</label>{children}</div>
  );
  const Toggle = ({ k, label }: { k: keyof Settings; label: string }) => (
    <button onClick={() => set(k, !s[k])} className="rounded-lg border px-3 py-1.5 text-sm"
      style={{ borderColor: "var(--border)", background: s[k] ? "var(--accent)" : "transparent", color: s[k] ? "#000" : "var(--text)" }}>
      {label}
    </button>
  );

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">Dados da loja</h1>
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <Field label="Endereço"><input className={inp} style={inpS} value={s.addressLine ?? ""} onChange={(e) => set("addressLine", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Chave Pix"><input className={inp} style={inpS} value={s.pixKey ?? ""} onChange={(e) => set("pixKey", e.target.value)} /></Field>
          <Field label="Nome do recebedor Pix"><input className={inp} style={inpS} value={s.pixKeyName ?? ""} onChange={(e) => set("pixKeyName", e.target.value)} /></Field>
          <Field label="Tempo médio de entrega (min)"><input type="number" className={inp} style={inpS} value={s.avgDeliveryMin ?? ""} onChange={(e) => set("avgDeliveryMin", e.target.value)} /></Field>
          <Field label="Pedido mínimo (R$)"><input type="number" step="0.01" className={inp} style={inpS} value={s.minOrderValue ?? ""} onChange={(e) => set("minOrderValue", e.target.value)} /></Field>
        </div>

        <Field label="Formas de pagamento aceitas">
          <div className="flex flex-wrap gap-2">
            <Toggle k="acceptsPix" label="Pix" />
            <Toggle k="acceptsCash" label="Dinheiro" />
            <Toggle k="acceptsCard" label="Cartão" />
            <Toggle k="acceptsPickup" label="Retirada" />
          </div>
        </Field>

        <Field label="Mensagem de saudação"><textarea className={inp} style={inpS} rows={2} value={s.greetingMessage ?? ""} onChange={(e) => set("greetingMessage", e.target.value)} /></Field>
        <Field label="Mensagem de loja fechada"><textarea className={inp} style={inpS} rows={2} value={s.closingMessage ?? ""} onChange={(e) => set("closingMessage", e.target.value)} /></Field>
        <Field label="Política de entrega"><textarea className={inp} style={inpS} rows={2} value={s.deliveryPolicy ?? ""} onChange={(e) => set("deliveryPolicy", e.target.value)} /></Field>

        <div className="flex items-center gap-3">
          <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>Salvar</button>
          {saved && <span className="text-sm" style={{ color: "var(--accent)" }}>Salvo ✓</span>}
        </div>
      </div>
    </div>
  );
}
