"use client";
import {
  Bike,
  ChefHat,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Grid2X2,
  Menu,
  NotebookTabs,
  Settings,
  Users,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const nav = [
  ["Dashboard", "/dashboard", Grid2X2],
  ["Pedidos", "/pedidos", ClipboardList],
  ["Cozinha", "/cozinha", ChefHat],
  ["Cardapio", "/cardapio", NotebookTabs],
  ["Clientes", "/clientes", Users],
  ["Entregas", "/entregas", Bike],
  ["Financeiro", "/financeiro", CreditCard],
  ["Configuracoes", "/configuracoes", Settings],
] as const;

const bare = (p: string) => p.startsWith("/pedir") || p === "/login";

function Logo() {
  return (
    <a href="/dashboard" className="logo-ticket brand-wordmark text-[1.45rem]" aria-label="ZAPYE Food">
      <span>ZAPYE<br /><span className="brand-food">Food</span></span>
    </a>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  if (bare(pathname)) return <>{children}</>;

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-2">
      {nav.map(([label, href, Icon]) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <a
            key={href}
            href={href}
            onClick={onClick}
            className={`nav-tab px-4 py-3 ${active ? "nav-tab-active" : ""}`}
          >
            <Icon size={20} strokeWidth={1.85} />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <header className="app-sidebar sticky top-0 z-40 flex items-center justify-between border-b p-4 md:hidden" style={{ borderColor: "var(--border)" }}>
        <Logo />
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          className="secondary-button px-3 py-2 text-lg leading-none"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {open && (
        <div className="app-sidebar border-b p-4 md:hidden" style={{ borderColor: "var(--border)" }}>
          <NavLinks onClick={() => setOpen(false)} />
        </div>
      )}

      <aside className="app-sidebar hidden min-h-screen w-[246px] shrink-0 border-r px-6 py-9 md:flex md:flex-col" style={{ borderColor: "var(--border)" }}>
        <Logo />
        <div className="mt-7">
          <NavLinks />
        </div>

        <div className="mt-[170px] space-y-[70px]">
          <div className="sidebar-restaurant-card overflow-hidden">
            <img src="/food/promo-burger-fries.png" alt="Burger com fritas" className="h-[96px] w-full object-cover" />
            <div className="p-4">
              <div className="font-bold text-[0.95rem]">ZAPYE Food</div>
              <div className="mt-1 text-xs muted-ink">Restaurant</div>
            </div>
          </div>

          <div className="sidebar-admin-card flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-[#f4d6c5] text-sm font-black">A</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">Admin Zapye</div>
              <div className="truncate text-xs muted-ink">admin@zapyefood.com</div>
            </div>
            <ChevronDown size={16} color="var(--text)" />
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
