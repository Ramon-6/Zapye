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

  if (loading) return <div className="receipt-card p-5 text-sm muted-ink">Carregando ficha da loja...</div>;

  const inp = "w-full border-0 border-b px-2 py-2 text-sm";
  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-4"><label className="mb-1 block text-xs font-bold uppercase muted-ink">{label}</label>{children}</div>
  );
  const Toggle = ({ k, label }: { k: keyof Settings; label: string }) => (
    <button onClick={() => set(k, !s[k])} className={s[k] ? "stamp stamp-green" : "stamp stamp-red"}>
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl">
      <h1 className="page-title mb-5 text-3xl">Dados da loja</h1>
      <div className="receipt-card p-5">
        <Field label="Endereco"><input className={inp} value={s.addressLine ?? ""} onChange={(e) => set("addressLine", e.target.value)} /></Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Chave Pix"><input className={inp} value={s.pixKey ?? ""} onChange={(e) => set("pixKey", e.target.value)} /></Field>
          <Field label="Nome do recebedor Pix"><input className={inp} value={s.pixKeyName ?? ""} onChange={(e) => set("pixKeyName", e.target.value)} /></Field>
          <Field label="Tempo medio de entrega (min)"><input type="number" className={inp} value={s.avgDeliveryMin ?? ""} onChange={(e) => set("avgDeliveryMin", e.target.value)} /></Field>
          <Field label="Pedido minimo (R$)"><input type="number" step="0.01" className={inp} value={s.minOrderValue ?? ""} onChange={(e) => set("minOrderValue", e.target.value)} /></Field>
        </div>

        <Field label="Formas de pagamento aceitas">
          <div className="flex flex-wrap gap-2">
            <Toggle k="acceptsPix" label="Pix" />
            <Toggle k="acceptsCash" label="Dinheiro" />
            <Toggle k="acceptsCard" label="Cartao" />
            <Toggle k="acceptsPickup" label="Retirada" />
          </div>
        </Field>

        <Field label="Mensagem de saudacao"><textarea className={inp} rows={2} value={s.greetingMessage ?? ""} onChange={(e) => set("greetingMessage", e.target.value)} /></Field>
        <Field label="Mensagem de loja fechada"><textarea className={inp} rows={2} value={s.closingMessage ?? ""} onChange={(e) => set("closingMessage", e.target.value)} /></Field>
        <Field label="Politica de entrega"><textarea className={inp} rows={2} value={s.deliveryPolicy ?? ""} onChange={(e) => set("deliveryPolicy", e.target.value)} /></Field>

        <div className="receipt-divider flex items-center gap-3 pt-4">
          <button onClick={save} className="stamp-button px-4 py-2 text-sm">Salvar</button>
          {saved && <span className="stamp stamp-green">Salvo</span>}
        </div>
      </div>
    </div>
  );
}
