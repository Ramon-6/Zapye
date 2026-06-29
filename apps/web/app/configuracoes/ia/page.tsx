"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function IaPage() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiTone, setAiTone] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ settings: { aiEnabled?: boolean; aiTone?: string } }>("/settings")
      .then((r) => { setAiEnabled(r.settings?.aiEnabled ?? true); setAiTone(r.settings?.aiTone ?? ""); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function save() {
    await api("/settings", { method: "PATCH", body: JSON.stringify({ aiEnabled, aiTone }) });
    setSaved(true);
  }

  if (loading) return <div className="receipt-card p-5 text-sm muted-ink">Carregando ficha da IA...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="page-title mb-5 text-3xl">IA de atendimento</h1>
      <div className="receipt-card p-5">
        <div className="receipt-header mb-4 flex items-center justify-between gap-4 pb-4">
          <div>
            <div className="font-black">Atendimento automatico</div>
            <div className="text-xs muted-ink">Quando ligado, a IA responde os clientes no WhatsApp.</div>
          </div>
          <button onClick={() => { setAiEnabled((v) => !v); setSaved(false); }}
            className={aiEnabled ? "stamp stamp-green" : "stamp stamp-red"}>
            {aiEnabled ? "Ligada" : "Desligada"}
          </button>
        </div>

        <label className="mb-1 block text-xs font-bold uppercase muted-ink">Tom de voz / instrucoes extras</label>
        <textarea value={aiTone} onChange={(e) => { setAiTone(e.target.value); setSaved(false); }} rows={5}
          placeholder="Ex: seja bem informal, chame o cliente de chefia, sugira sempre a batata frita."
          className="mb-4 w-full border-0 border-b px-2 py-2 text-sm" />

        <div className="receipt-divider flex items-center gap-3 pt-4">
          <button onClick={save} className="stamp-button px-4 py-2 text-sm">Salvar</button>
          {saved && <span className="stamp stamp-green">Salvo</span>}
        </div>
      </div>
    </div>
  );
}
