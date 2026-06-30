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
      setErr("Credenciais invalidas");
    }
  }

  return (
    <div className="login-table flex min-h-screen items-center justify-center p-5">
      <form onSubmit={submit} className="receipt-card w-full max-w-md p-7">
        <div className="food-thumb mb-5 h-36 w-full" />
        <div className="mb-6 text-center">
          <div className="brand-wordmark text-5xl">ZAPYE<br /><span className="brand-food">Food</span></div>
          <p className="mt-3 text-sm muted-ink">Entre para vender, acompanhar pedidos e cuidar da cozinha em tempo real.</p>
        </div>
        <label className="mb-3 block text-xs font-bold uppercase muted-ink">
          E-mail
          <input className="mt-1 w-full border-0 border-b px-0 py-2 text-sm" placeholder="admin@zapyefood.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mb-4 block text-xs font-bold uppercase muted-ink">
          Senha
          <input type="password" className="mt-1 w-full border-0 border-b px-0 py-2 text-sm" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <p className="highlight-note mb-3 p-2 text-xs">{err}</p>}
        <button className="stamp-button w-full px-4 py-3 text-sm">Entrar</button>
        <div className="receipt-divider mt-5 pt-4 text-center text-xs muted-ink">Gestao food rapida para restaurantes locais</div>
      </form>
    </div>
  );
}
