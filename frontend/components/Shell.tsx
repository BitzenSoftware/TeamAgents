"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookOpen, Building2, CalendarClock, CreditCard, Gauge, Inbox,
  Layers, LifeBuoy, LogOut, Mail, Megaphone, Menu, MessageCircle, Newspaper,
  Package, Scissors, Settings, Sparkles, Users, X, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useCliente } from "@/components/cliente-context";
import { Logo } from "@/components/Logo";
import { api, SUPERADMIN_EMAIL, type Consumo } from "@/lib/api";

type NavItem = { href: string; label: string; icon: LucideIcon; grupo: string };

const NAV: NavItem[] = [
  { href: "/pipeline", label: "Agente SDR", icon: MessageCircle, grupo: "Agentes" },
  { href: "/campanhas", label: "Agente de Copywriting", icon: Megaphone, grupo: "Agentes" },
  { href: "/executivo", label: "Agente Executivo", icon: Mail, grupo: "Agentes" },
  { href: "/consultoria", label: "Agente Diretor de BI", icon: BarChart3, grupo: "Agentes" },
  { href: "/profissionais", label: "Profissionais", icon: Users, grupo: "Workspace" },
  { href: "/servicos", label: "Serviços", icon: Scissors, grupo: "Workspace" },
  { href: "/agenda", label: "Agenda", icon: CalendarClock, grupo: "Workspace" },
  { href: "/habilidades", label: "Habilidades", icon: Sparkles, grupo: "Workspace" },
  { href: "/consumo", label: "Consumo", icon: Gauge, grupo: "Workspace" },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard, grupo: "Workspace" },
  { href: "/configuracoes", label: "Configurações", icon: Settings, grupo: "Workspace" },
  { href: "/suporte", label: "Suporte", icon: LifeBuoy, grupo: "Workspace" },
  { href: "/guia", label: "Guia do Usuário", icon: BookOpen, grupo: "Workspace" },
];

const NAV_ADMIN: NavItem[] = [
  { href: "/growth", label: "Growth (minha diretoria)", icon: Sparkles, grupo: "Admin" },
  { href: "/empresas", label: "Empresas", icon: Building2, grupo: "Admin" },
  { href: "/admin-suporte", label: "Suporte (admin)", icon: Inbox, grupo: "Admin" },
  { href: "/admin-blog", label: "Blog", icon: Newspaper, grupo: "Admin" },
  { href: "/planos", label: "Planos", icon: Layers, grupo: "Admin" },
  { href: "/pacotes", label: "Pacotes", icon: Package, grupo: "Admin" },
];

const GRUPOS = ["Agentes", "Workspace", "Admin"];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, signOut } = useAuth();
  const { cliente } = useCliente();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  const nav = isAdmin ? [...NAV, ...NAV_ADMIN] : NAV;

  // Menu lateral vira drawer no mobile; fecha ao navegar.
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => { setMenuAberto(false); }, [pathname]);

  // Aviso global: conta sem créditos (sem plano pago e sem avulsos) → Assinatura.
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  useEffect(() => {
    if (cliente) api.consumo().then(setConsumo).catch(() => {});
  }, [cliente, pathname]);

  // Badges de suporte (respostas não lidas pelo cliente; e mensagens de clientes p/ admin).
  const [naoLidas, setNaoLidas] = useState(0);
  const [adminNaoLidas, setAdminNaoLidas] = useState(0);
  useEffect(() => {
    if (!cliente) return;
    const tick = () => {
      api.suporteNaoLidas().then((r) => setNaoLidas(r.n)).catch(() => {});
      if (isAdmin) {
        api.adminSuporteThreads()
          .then((ts) => setAdminNaoLidas(ts.reduce((a, t) => a + (t.nao_lidas || 0), 0)))
          .catch(() => {});
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [cliente, isAdmin, pathname]);

  const semCreditos =
    !!consumo && !consumo.ilimitado && (consumo.total ?? 0) === 0 && (consumo.creditos_avulsos ?? 0) === 0;
  const mostrarAviso = semCreditos && !pathname.startsWith("/assinatura") && !pathname.startsWith("/onboarding");

  const nomeConta = cliente?.nome ?? "Painel";
  const inicial = (cliente?.nome?.trim()?.[0] ?? session?.user.email?.[0] ?? "T").toUpperCase();

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Backdrop (só mobile, quando o drawer está aberto) */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuAberto(false)} aria-hidden />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col gap-2 border-r border-black/10 bg-white px-3 py-4 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${
          menuAberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Marca */}
        <div className="flex items-center gap-2.5 px-2 pb-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm">
            <Logo size={20} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-bold tracking-tight">TeamAgents</div>
            <div className="truncate text-[11px] text-black/45">{nomeConta}</div>
          </div>
          {/* Fechar drawer (só mobile) */}
          <button
            type="button"
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-black/40 hover:bg-black/[0.04] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegação agrupada */}
        <nav className="-mr-1 flex flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {GRUPOS.map((grupo) => {
            const itens = nav.filter((i) => i.grupo === grupo);
            if (itens.length === 0) return null;
            return (
              <div key={grupo} className="mb-1">
                <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-black/30">{grupo}</div>
                {itens.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const badge = item.href === "/suporte" ? naoLidas : item.href === "/admin-suporte" ? adminNaoLidas : 0;
                  const Ico = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active ? "bg-brand text-white shadow-sm shadow-brand/20" : "text-black/70 hover:bg-black/[0.04] hover:text-ink"
                      }`}
                    >
                      <Ico size={17} className={active ? "text-white" : "text-black/35 group-hover:text-brand"} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white text-brand" : "bg-rose-500 text-white"}`}>
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Rodapé: conta + sair */}
        <div className="mt-auto flex items-center gap-2.5 border-t border-black/5 px-1 pt-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">{inicial}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-ink">{nomeConta}</div>
            <div className="truncate text-[11px] text-black/40">{session?.user.email}</div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sair"
            aria-label="Sair"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-black/40 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra de topo (só mobile) com o botão do menu */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-black/10 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu"
            className="grid h-9 w-9 place-items-center rounded-lg text-ink hover:bg-black/[0.04]"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white">
              <Logo size={16} />
            </span>
            <span className="text-sm font-bold tracking-tight">TeamAgents</span>
          </span>
        </header>

        <main className="flex-1 overflow-auto bg-paper">
          {mostrarAviso && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3">
              <span className="text-sm text-amber-900">
                <strong>Sua conta ainda não tem créditos.</strong> Escolha um plano para ativar os agentes.
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
    </div>
  );
}
