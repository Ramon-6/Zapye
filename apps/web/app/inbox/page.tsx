"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../lib/api";

type Msg = { id: string; sender: string; direction: string; content: string; createdAt: string };
type Conv = {
  id: string; status: string;
  client: { id: string; name: string | null; phone: string; tags: string[] };
  messages: { content: string; createdAt: string }[];
};

const STATUS_LABEL: Record<string, string> = { BOT: "IA", HUMAN: "Humano", WAITING: "Aguardando", CLOSED: "Fechada" };
const STATUS_COLOR: Record<string, string> = { BOT: "var(--accent)", HUMAN: "#60a5fa", WAITING: "var(--accent-warn)", CLOSED: "var(--muted)" };

export default function InboxPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(() => { api<Conv[]>("/conversations").then(setConvs).catch(() => {}); }, []);
  const loadMsgs = useCallback((id: string) => {
    api<Msg[]>(`/conversations/${id}/messages`).then((m) => { setMsgs(m); setTimeout(() => endRef.current?.scrollIntoView(), 50); }).catch(() => {});
  }, []);

  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 5000); return () => clearInterval(t); }, [loadConvs]);
  useEffect(() => {
    if (!active) return;
    loadMsgs(active.id);
    const t = setInterval(() => loadMsgs(active.id), 4000);
    return () => clearInterval(t);
  }, [active, loadMsgs]);

  async function takeover() { if (!active) return; await api(`/conversations/${active.id}/takeover`, { method: "POST" }); setActive({ ...active, status: "HUMAN" }); loadConvs(); }
  async function release() { if (!active) return; await api(`/conversations/${active.id}/release`, { method: "POST" }); setActive({ ...active, status: "BOT" }); loadConvs(); }
  async function send() {
    if (!active || !text.trim()) return;
    const t = text; setText("");
    await api(`/conversations/${active.id}/send`, { method: "POST", body: JSON.stringify({ text: t }) });
    loadMsgs(active.id);
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* Lista de conversas */}
      <div className="w-72 overflow-auto rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="border-b p-3 text-sm font-semibold" style={{ borderColor: "var(--border)" }}>Conversas</div>
        {convs.length === 0 && <p className="p-3 text-sm" style={{ color: "var(--muted)" }}>Nenhuma conversa ainda.</p>}
        {convs.map((c) => (
          <button key={c.id} onClick={() => setActive(c)} className="block w-full border-b p-3 text-left hover:bg-white/5"
            style={{ borderColor: "var(--border)", background: active?.id === c.id ? "rgba(255,255,255,0.04)" : "transparent" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{c.client.name ?? c.client.phone}</span>
              <span className="text-[10px]" style={{ color: STATUS_COLOR[c.status] }}>● {STATUS_LABEL[c.status]}</span>
            </div>
            <div className="truncate text-xs" style={{ color: "var(--muted)" }}>{c.messages[0]?.content ?? ""}</div>
          </button>
        ))}
      </div>

      {/* Thread */}
      <div className="flex flex-1 flex-col rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm" style={{ color: "var(--muted)" }}>Selecione uma conversa</div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b p-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="text-sm font-semibold">{active.client.name ?? active.client.phone}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{active.client.phone}
                  {active.client.tags?.map((t) => <span key={t} className="ml-1 rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--border)" }}>{t}</span>)}
                </div>
              </div>
              {active.status === "BOT"
                ? <button onClick={takeover} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-black" style={{ background: "var(--accent)" }}>Assumir conversa</button>
                : <button onClick={release} className="rounded-lg border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>Devolver à IA</button>}
            </div>

            <div className="flex-1 overflow-auto p-4">
              {msgs.map((m) => {
                const mine = m.sender !== "CLIENT";
                return (
                  <div key={m.id} className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[75%] rounded-2xl px-3 py-2 text-sm"
                      style={{ background: mine ? "var(--accent)" : "var(--border)", color: mine ? "#000" : "var(--text)" }}>
                      {m.sender === "HUMAN" && <div className="text-[10px] opacity-70">atendente</div>}
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="flex gap-2 border-t p-3" style={{ borderColor: "var(--border)" }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={active.status === "BOT" ? "Assuma a conversa para responder…" : "Escreva uma mensagem…"}
                className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }} />
              <button onClick={send} className="rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>Enviar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
