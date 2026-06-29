"use client";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Pedidos", "/pedidos"],
  ["Cozinha", "/cozinha"],
  ["Inbox", "/inbox"],
  ["Cardapio", "/cardapio"],
  ["Clientes", "/clientes"],
  ["Entregas", "/entregas"],
  ["Financeiro", "/financeiro"],
  ["Configuracoes", "/configuracoes"],
  ["Guia visual", "/style-guide"],
];

const bare = (p: string) => p.startsWith("/pedir") || p === "/login";

function Logo() {
  return (
    <a href="/dashboard" className="logo-ticket brand-wordmark text-xl" aria-label="ZAPYE Food">
      <span>ZAPYE<br /><span className="brand-food">Food</span></span>
    </a>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  if (bare(pathname)) return <>{children}</>;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1.5">
      {nav.map(([label, href]) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <a
            key={href}
            href={href}
            onClick={onClick}
            className={`nav-tab px-3 py-2 ${active ? "nav-tab-active" : ""}`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="app-sidebar sticky top-0 z-40 flex items-center justify-between border-b p-3 md:hidden" style={{ borderColor: "var(--border)" }}>
        <Logo />
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          className="secondary-button px-3 py-2 text-lg leading-none"
        >
          {open ? "x" : "☰"}
        </button>
      </header>

      {open && (
        <div className="app-sidebar border-b p-3 md:hidden" style={{ borderColor: "var(--border)" }}>
          <NavLinks onClick={() => setOpen(false)} />
        </div>
      )}

      <aside className="app-sidebar hidden w-60 shrink-0 border-r p-4 md:block" style={{ borderColor: "var(--border)" }}>
        <div className="mb-8">
          <Logo />
          <div className="mt-4 border-t pt-3 text-xs font-bold uppercase" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
            Bloco de comandas
          </div>
        </div>
        <NavLinks />
      </aside>

      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
