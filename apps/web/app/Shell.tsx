"use client";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Pedidos", "/pedidos"],
  ["Cozinha", "/cozinha"],
  ["Inbox", "/inbox"],
  ["Cardápio", "/cardapio"],
  ["Clientes", "/clientes"],
  ["Entregas", "/entregas"],
  ["Financeiro", "/financeiro"],
  ["Configurações", "/configuracoes"],
];

// Páginas sem o painel (sidebar): cardápio público e login.
const bare = (p: string) => p.startsWith("/pedir") || p === "/login";

function Logo() {
  return <div className="text-lg font-bold">ZAPYE <span style={{ color: "var(--accent)" }}>Food</span></div>;
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  if (bare(pathname)) return <>{children}</>;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {nav.map(([label, href]) => (
        <a key={href} href={href} onClick={onClick}
          className="rounded-lg px-3 py-2 text-sm hover:bg-white/5"
          style={{ color: pathname.startsWith(href) ? "var(--text)" : "var(--muted)", background: pathname.startsWith(href) ? "rgba(255,255,255,0.05)" : "transparent" }}>
          {label}
        </a>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Topbar (mobile) */}
      <header className="flex items-center justify-between border-b p-3 md:hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <Logo />
        <button onClick={() => setOpen((o) => !o)} aria-label="Menu"
          className="rounded-lg border px-3 py-1.5 text-lg leading-none" style={{ borderColor: "var(--border)" }}>
          {open ? "✕" : "☰"}
        </button>
      </header>

      {/* Menu dropdown (mobile) */}
      {open && (
        <div className="border-b p-3 md:hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <NavLinks onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 border-r p-4 md:block" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-6"><Logo /></div>
        <NavLinks />
      </aside>

      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
