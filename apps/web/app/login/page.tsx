"use client";
import { useState } from "react";
import { login } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("ze@burger.com");
  const [password, setPassword] = useState("zapye123");
  const [err, setErr] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(undefined);
    try {
      await login(email, password);
      window.location.href = "/dashboard";
    } catch {
      setErr("Credenciais inválidas");
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={submit} className="w-80 rounded-xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-4 text-xl font-bold">ZAPYE <span style={{ color: "var(--accent)" }}>Food</span></div>
        <input className="mb-2 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}
          placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="mb-3 w-full rounded-lg border bg-transparent px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}
          placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="mb-2 text-xs" style={{ color: "var(--accent-warn)" }}>{err}</p>}
        <button className="w-full rounded-lg py-2 text-sm font-semibold text-black" style={{ background: "var(--accent)" }}>Entrar</button>
      </form>
    </div>
  );
}
