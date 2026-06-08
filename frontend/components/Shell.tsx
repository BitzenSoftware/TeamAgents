"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useCliente } from "@/components/cliente-context";
import { SUPERADMIN_EMAIL } from "@/lib/api";

const NAV = [
  { href: "/pipeline", label: "Pipeline", hint: "Comercial / SDR" },
  { href: "/campanhas", label: "Campanhas", hint: "Fábrica / Copy" },
  { href: "/habilidades", label: "Habilidades", hint: "Conhecimento da empresa" },
  { href: "/consultoria", label: "Consultoria", hint: "Diretor de BI" },
  { href: "/configuracoes", label: "Configurações", hint: "WhatsApp / Agenda" },
  { href: "/guia", label: "Guia do Utilizador", hint: "Como funciona" },
];

const NAV_ADMIN = [{ href: "/planos", label: "Planos", hint: "Admin / Stripe" }];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const { cliente } = useCliente();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  const nav = isAdmin ? [...NAV, ...NAV_ADMIN] : NAV;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-black/10 bg-white/60 p-5">
        <div>
          <div className="text-lg font-semibold tracking-tight">TeamAgents</div>
          <div className="text-xs text-black/50">{cliente?.nome ?? "Painel"}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-brand text-white" : "hover:bg-black/5"
                }`}
              >
                <div className="font-medium">{item.label}</div>
                <div className={`text-xs ${active ? "text-white/60" : "text-black/40"}`}>
                  {item.hint}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto text-xs text-black/50">
          <div className="truncate">{session?.user.email}</div>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 rounded-lg border border-black/15 px-3 py-1.5 text-sm text-ink hover:bg-black/5"
          >
            Terminar sessão
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
