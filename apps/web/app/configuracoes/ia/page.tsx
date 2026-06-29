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

  if (loading) return <p style={{ color: "var(--muted)" }}>Carregando…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-2xl font-bold">IA de atendimento</h1>
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">Atendimento automático</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Quando ligado, a IA responde os clientes no WhatsApp.</div>
          </div>
          <button onClick={() => { setAiEnabled((v) => !v); setSaved(false); }}
            className="rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ background: aiEnabled ? "var(--accent)" : "var(--border)", color: aiEnabled ? "#000" : "var(--muted)" }}>
            {aiEnabled ? "Ligada" : "Desligada"}
          </button>
        </div>

        <label className="mb-1 block text-xs" style={{ color: "var(--muted)" }}>Tom de voz / instruções extras</label>
        <textarea value={aiTone} onChange={(e) => { setAiTone(e.target.value); setSaved(false); }} rows={4}
          placeholder="Ex: seja bem informal, chame o cliente de 'chefia', sugira sempre a batata frita."
          className="mb-4 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />

        <div className="flex items-center gap-3">
          <button onClick={save} className="rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>Salvar</button>
          {saved && <span className="text-sm" style={{ color: "var(--accent)" }}>Salvo ✓</span>}
        </div>
      </div>
    </div>
  );
}
