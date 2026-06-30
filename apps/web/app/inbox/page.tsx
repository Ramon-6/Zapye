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
const STATUS_STAMP: Record<string, string> = { BOT: "stamp-green", HUMAN: "stamp-blue", WAITING: "stamp-yellow", CLOSED: "stamp-red" };

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

  const bubbleClass = (m: Msg) => {
    if (m.sender === "CLIENT") return "chat-bubble-client";
    if (m.sender === "BOT" || m.sender === "AI") return "chat-bubble-ai";
    return "chat-bubble-human";
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4 lg:flex-row">
      <aside className="receipt-card min-h-48 w-full overflow-auto lg:w-80">
        <div className="receipt-header flex items-center justify-between p-3">
          <h1 className="page-title text-xl">Inbox</h1>
          <span className="stamp stamp-blue">{convs.length}</span>
        </div>
        {convs.length === 0 && <p className="p-4 text-sm muted-ink">Nenhuma conversa ainda.</p>}
        {convs.map((c) => (
          <button key={c.id} onClick={() => setActive(c)} className="notebook-line block w-full p-3 text-left"
            style={{ background: active?.id === c.id ? "rgba(132, 204, 22, 0.12)" : "transparent" }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-black">{c.client.name ?? c.client.phone}</span>
              <span className={`stamp ${STATUS_STAMP[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <div className="mt-1 truncate text-xs muted-ink">{c.messages[0]?.content ?? ""}</div>
          </button>
        ))}
      </aside>

      <section className="receipt-card flex min-h-0 flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm muted-ink">Selecione uma conversa na lista de papel.</div>
        ) : (
          <>
            <div className="receipt-header flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <h2 className="text-sm font-black">{active.client.name ?? active.client.phone}</h2>
                <div className="text-xs muted-ink">{active.client.phone}
                  {active.client.tags?.map((t) => <span key={t} className="stamp stamp-blue ml-1">{t}</span>)}
                </div>
              </div>
              {active.status === "BOT"
                ? <button onClick={takeover} className="stamp-button px-3 py-2 text-xs">Assumir conversa</button>
                : <button onClick={release} className="secondary-button px-3 py-2 text-xs">Devolver a IA</button>}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {msgs.map((m) => {
                const mine = m.sender !== "CLIENT";
                return (
                  <div key={m.id} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[78%] rounded-lg border px-3 py-2 text-sm shadow-sm ${bubbleClass(m)}`} style={{ borderColor: "var(--border)" }}>
                      {m.sender === "HUMAN" && <div className="text-[10px] font-bold uppercase opacity-70">atendente</div>}
                      {m.content}
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="receipt-divider flex gap-2 p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={active.status === "BOT" ? "Assuma a conversa para responder..." : "Escreva uma mensagem..."}
                className="flex-1 border-0 border-b px-2 py-2 text-sm" />
              <button onClick={send} className="stamp-button px-4 py-2 text-sm">Enviar</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
