"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { useCliente } from "@/components/cliente-context";
import { api, SUPERADMIN_EMAIL, type Consumo } from "@/lib/api";

const NAV = [
  { href: "/pipeline", label: "Agente SDR", hint: "Comercial / Pipeline" },
  { href: "/campanhas", label: "Agente de Copywriting", hint: "Anúncios & Copy" },
  { href: "/executivo", label: "Agente Executivo", hint: "Email & Atas" },
  { href: "/consultoria", label: "Agente Diretor de BI", hint: "Consultoria & Dados" },
  { href: "/habilidades", label: "Habilidades", hint: "Conhecimento da empresa" },
  { href: "/consumo", label: "Consumo", hint: "Créditos / Dashboard" },
  { href: "/assinatura", label: "Assinatura", hint: "Planos & Pacotes" },
  { href: "/configuracoes", label: "Configurações", hint: "WhatsApp / Agenda" },
  { href: "/guia", label: "Guia do Utilizador", hint: "Como funciona" },
];

const NAV_ADMIN = [
  { href: "/empresas", label: "Empresas", hint: "Cadastro / Métricas" },
  { href: "/planos", label: "Planos", hint: "Admin / Stripe" },
  { href: "/pacotes", label: "Pacotes", hint: "Créditos avulsos" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const { cliente } = useCliente();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  const nav = isAdmin ? [...NAV, ...NAV_ADMIN] : NAV;

  // Aviso global: conta sem créditos (sem plano pago e sem avulsos) → Assinatura.
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  useEffect(() => {
    if (cliente) api.consumo().then(setConsumo).catch(() => {});
  }, [cliente, pathname]);
  const semCreditos =
    !!consumo &&
    !consumo.ilimitado &&
    (consumo.total ?? 0) === 0 &&
    (consumo.creditos_avulsos ?? 0) === 0;
  const mostrarAviso = semCreditos && !pathname.startsWith("/assinatura") && !pathname.startsWith("/onboarding");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-black/10 bg-white p-5">
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
      <main className="flex-1 overflow-auto">
        {mostrarAviso && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
            <span className="text-sm text-amber-900">
              <strong>A tua conta ainda não tem créditos.</strong> Escolhe um plano para ativar os agentes.
            </span>
            <Link
              href="/assinatura"
              className="shrink-0 rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Escolher plano →
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
