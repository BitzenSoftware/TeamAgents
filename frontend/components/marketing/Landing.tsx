"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  ArrowRight, Bot, Calendar, Check, CheckCircle, ChevronRight, Clock, Cpu,
  FileText, FolderKanban, Globe, Layers, Mail, Megaphone, Menu, MessageCircle, Scale,
  Shield, Sparkles, Target, TrendingUp, Users, Wallet, Workflow, X, Zap,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LangSwitcher } from "@/components/marketing/LangSwitcher";
import { landingCopy } from "@/lib/i18n/landing";
import type { Locale } from "@/lib/i18n/locale";

/* ===== Mapas de ícones/cores (não vão no dicionário; alinham por índice/id) ===== */

const SEL_META: Record<string, { icon: JSX.Element; tagCor: string }> = {
  sdr: { icon: <MessageCircle size={20} className="text-emerald-600" />, tagCor: "bg-emerald-100 text-emerald-700" },
  copy: { icon: <Megaphone size={20} className="text-violet-600" />, tagCor: "bg-violet-100 text-violet-700" },
  fin: { icon: <Wallet size={20} className="text-emerald-600" />, tagCor: "bg-emerald-100 text-emerald-700" },
  jur: { icon: <Scale size={20} className="text-indigo-600" />, tagCor: "bg-indigo-100 text-indigo-700" },
  proj: { icon: <FolderKanban size={20} className="text-cyan-600" />, tagCor: "bg-cyan-100 text-cyan-700" },
  estr: { icon: <Target size={20} className="text-violet-600" />, tagCor: "bg-violet-100 text-violet-700" },
};

const ESPECIALISTA_ICONS = [Wallet, Scale, Bot, Layers, Users, Shield, FolderKanban, Target, TrendingUp, Workflow];
const OPS_ICONS = [
  <MessageCircle key="0" size={14} className="text-emerald-300" />,
  <Wallet key="1" size={14} className="text-emerald-300" />,
  <Scale key="2" size={14} className="text-indigo-300" />,
  <FolderKanban key="3" size={14} className="text-amber-300" />,
];
const OPS_BADGE_COR = ["bg-emerald-400/15 text-emerald-300", "bg-violet-400/15 text-violet-300", "bg-sky-400/15 text-sky-300", "bg-amber-400/15 text-amber-300"];
const GESTAO_ICONS = [
  <Layers key="0" size={18} className="text-indigo-300" />,
  <FileText key="1" size={18} className="text-emerald-300" />,
  <MessageCircle key="2" size={18} className="text-sky-300" />,
  <FolderKanban key="3" size={18} className="text-amber-300" />,
];
const TECH_ICONS = [
  <Cpu key="0" size={18} className="text-indigo-300" />,
  <Calendar key="1" size={18} className="text-emerald-300" />,
  <Wallet key="2" size={18} className="text-amber-300" />,
  <Shield key="3" size={18} className="text-sky-300" />,
];
const HAB_COR = ["bg-black/5 text-black/60", "bg-emerald-100 text-emerald-700", "bg-emerald-100 text-emerald-700"];

type PlanoLanding = { nome: string; preco: string; creditos: string; destaque: boolean; para: string; extras: string[] };

function formatarPreco(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
}

/* ============================== Página ============================== */

export function Landing({ locale }: { locale: Locale }) {
  const t = landingCopy[locale];
  const [planos, setPlanos] = useState<PlanoLanding[]>(t.precos.planos);
  const [menuMobile, setMenuMobile] = useState(false);

  useEffect(() => {
    // Puxa os preços reais da BD por moeda: PT→BRL, EN→USD. Se não houver planos
    // nessa moeda ainda, mantém os estáticos do dicionário (fallback).
    const moeda = locale === "en" ? "usd" : "brl";
    const bcp = locale === "en" ? "en-US" : "pt-BR";
    const copyByName = Object.fromEntries(t.precos.planos.map((p) => [p.nome, p]));
    fetch(`${API_BASE}/planos/publicos?moeda=${moeda}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { nome: string; creditos_mensais: number; preco: number; ordem: number }[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const meio = Math.floor(rows.length / 2);
        setPlanos(
          rows.map((p, i) => {
            const copy = copyByName[p.nome];
            const creditos = Number(p.creditos_mensais).toLocaleString(bcp);
            return {
              nome: p.nome,
              preco: formatarPreco(Number(p.preco)),
              creditos,
              destaque: p.nome === "Pro" || (!rows.some((r) => r.nome === "Pro") && i === meio),
              para: copy?.para ?? "",
              extras: copy?.extras ?? [],
            };
          }),
        );
      })
      .catch(() => {});
  }, [locale, t.precos.planos]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ====================== NAV ====================== */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1f]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white"><Logo size={18} /></span>
            <span className="font-semibold tracking-tight">TeamAgents</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            {t.nav.links.map((l) => (<a key={l.href} href={l.href} className="transition hover:text-white">{l.label}</a>))}
            <Link href="/blog" className="transition hover:text-white">{t.nav.blog}</Link>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher locale={locale} labels={t.switcher} />
            <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0a0a1f] transition hover:bg-white/90">
              {t.nav.entrar} <ArrowRight size={14} />
            </Link>
            <button type="button" onClick={() => setMenuMobile((v) => !v)} aria-label={menuMobile ? t.nav.fecharMenu : t.nav.abrirMenu}
              className="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 md:hidden">
              {menuMobile ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuMobile && (
          <div className="border-t border-white/10 bg-[#0a0a1f] px-6 py-3 md:hidden">
            <div className="flex flex-col">
              {t.nav.links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuMobile(false)} className="rounded-lg px-2 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">{l.label}</a>
              ))}
              <Link href="/blog" onClick={() => setMenuMobile(false)} className="rounded-lg px-2 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">{t.nav.blog}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ====================== HERO ====================== */}
      <header className="relative overflow-hidden bg-[#0a0a1f] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="lp-anim lp-blob absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand/30 blur-[120px]" />
          <div className="lp-anim lp-blob2 absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/20 blur-[110px]" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-24">
          <div>
            <div className="lp-anim lp-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">
              <Sparkles size={13} className="text-amber-300" />{t.hero.badge}
            </div>
            <h1 className="lp-anim lp-up mb-6 text-3xl font-bold leading-[1.1] tracking-tight [animation-delay:.08s] sm:text-4xl md:text-6xl md:leading-[1.08]">
              {t.hero.titulo1}<br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">{t.hero.titulo2}</span>
            </h1>
            <p className="lp-anim lp-up mb-9 max-w-xl text-lg leading-relaxed text-white/60 [animation-delay:.16s]">
              {t.hero.subtituloA}<strong className="text-white/85">{t.hero.subtituloStrong1}</strong>{t.hero.subtituloB}
              <strong className="text-white/85">{t.hero.subtituloStrong2}</strong>{t.hero.subtituloC}
            </p>
            <div className="lp-anim lp-up flex flex-col gap-3 [animation-delay:.24s] sm:flex-row">
              <Link href="/login" className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-7 py-3.5 text-sm font-semibold shadow-lg shadow-brand/30 transition hover:shadow-brand/50">
                {t.hero.ctaPrimary}<ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#agentes" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-medium text-white/75 transition hover:border-white/35 hover:text-white">
                {t.hero.ctaSecondary} <ChevronRight size={14} />
              </a>
            </div>
            <div className="lp-anim lp-up mt-12 grid grid-cols-2 gap-x-8 gap-y-6 [animation-delay:.32s] sm:grid-cols-4">
              {t.hero.stats.map((s) => (
                <div key={s.rotulo}><div className="text-2xl font-bold">{s.valor}</div><div className="mt-0.5 text-xs leading-snug text-white/45">{s.rotulo}</div></div>
              ))}
            </div>
          </div>
          <HeroMedia t={t} />
        </div>
        <div className="relative border-t border-white/8 bg-white/[0.03] py-3.5">
          <div className="lp-marquee-mask overflow-hidden">
            <div className="lp-anim lp-marquee flex w-max gap-10 whitespace-nowrap text-xs font-medium text-white/40">
              {[...t.marquee, ...t.marquee].map((m, i) => (<span key={i} className="flex items-center gap-2"><Zap size={11} className="text-brand" />{m}</span>))}
            </div>
          </div>
        </div>
      </header>

      {/* ====================== DUAS FRENTES ====================== */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.frentes.titulo}</h2>
            <p className="mx-auto max-w-2xl text-black/50">{t.frentes.subtitulo}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-7">
              <span className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><MessageCircle size={20} /></span>
              <h3 className="mb-2 text-xl font-bold tracking-tight">{t.frentes.card1Titulo}</h3>
              <p className="mb-4 text-sm leading-relaxed text-black/55">{t.frentes.card1Desc}</p>
              <ul className="space-y-2 text-sm">
                {t.frentes.card1Itens.map((x) => (<li key={x} className="flex items-center gap-2 text-black/70"><Check size={15} className="shrink-0 text-emerald-600" /> {x}</li>))}
              </ul>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-7">
              <span className="mb-3 inline-flex rounded-xl bg-brand/10 p-2.5 text-brand"><FolderKanban size={20} /></span>
              <h3 className="mb-2 text-xl font-bold tracking-tight">{t.frentes.card2Titulo}</h3>
              <p className="mb-4 text-sm leading-relaxed text-black/55">{t.frentes.card2Desc}</p>
              <ul className="space-y-2 text-sm">
                {t.frentes.card2Itens.map((x) => (<li key={x} className="flex items-center gap-2 text-black/70"><Check size={15} className="shrink-0 text-brand" /> {x}</li>))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== SELETOR DE AGENTES ====================== */}
      <SeletorAgentes t={t} />

      {/* ====================== AGENTES ====================== */}
      <section id="agentes" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{t.agentes.badge}</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.agentes.titulo}</h2>
            <p className="mx-auto max-w-2xl text-black/50">{t.agentes.subtitulo}</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <AgentCard icon={<MessageCircle size={20} className="text-emerald-600" />} tag={t.agentes.sdr.tag} tagCor="bg-emerald-100 text-emerald-700"
              nome={t.agentes.sdr.nome} desc={t.agentes.sdr.desc} checks={t.agentes.sdr.checks}>
              <div className="space-y-2 text-xs">
                {t.agentes.sdr.chat.map((c, i) => (<ChatBubble key={i} lado={c.lado as "lead" | "agente"} delay={`${0.2 + i * 0.5}s`}>{c.texto}</ChatBubble>))}
                <div className="lp-anim lp-up flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-emerald-700 [animation-delay:2.2s]"><CheckCircle size={13} /> {t.agentes.sdr.chatFooter}</div>
              </div>
            </AgentCard>

            <AgentCard icon={<Megaphone size={20} className="text-violet-600" />} tag={t.agentes.copy.tag} tagCor="bg-violet-100 text-violet-700"
              nome={t.agentes.copy.nome} desc={t.agentes.copy.desc} checks={t.agentes.copy.checks}>
              <div className="rounded-lg border border-violet-200 bg-white p-3.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-500">{t.agentes.copy.adLabel}</div>
                <p className="text-sm font-semibold leading-snug">{t.agentes.copy.adTitulo}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-black/55">{t.agentes.copy.adTexto}</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium">
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">{t.agentes.copy.tagGatilho}</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-black/60">{t.agentes.copy.tagPalavra}</span>
                </div>
              </div>
            </AgentCard>

            <AgentCard icon={<Mail size={20} className="text-sky-600" />} tag={t.agentes.exec.tag} tagCor="bg-sky-100 text-sky-700"
              nome={t.agentes.exec.nome} desc={t.agentes.exec.desc} checks={t.agentes.exec.checks}>
              <div className="rounded-lg border border-sky-200 bg-white p-3.5 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-black/70">{t.agentes.exec.resumo}</span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">{t.agentes.exec.hora}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">{t.agentes.exec.alta}</span><span className="text-black/70">{t.agentes.exec.altaTexto}</span></div>
                  <div className="flex items-center gap-2"><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{t.agentes.exec.media}</span><span className="text-black/70">{t.agentes.exec.mediaTexto}</span></div>
                </div>
              </div>
            </AgentCard>
          </div>

          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-1 text-sm font-semibold">{t.agentes.especialistasTitulo}</div>
            <p className="mb-4 text-sm text-black/50">{t.agentes.especialistasDesc}</p>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              {t.agentes.especialistas.map((n, i) => {
                const I = ESPECIALISTA_ICONS[i] ?? Wallet;
                return (<span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-paper px-3 py-1.5 text-black/65"><I size={13} className="text-brand" /> {n}</span>);
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ====================== GESTÃO ====================== */}
      <section id="gestao" className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" /></div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">{t.gestao.badge}</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.gestao.titulo}</h2>
            <p className="mx-auto max-w-2xl text-white/50">{t.gestao.subtitulo}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {t.gestao.cards.map((c, i) => (<GestaoCard key={c.titulo} icon={GESTAO_ICONS[i]} titulo={c.titulo} desc={c.desc} />))}
          </div>
        </div>
      </section>

      {/* ====================== HABILIDADES ====================== */}
      <section className="border-b border-black/5 bg-white px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{t.habilidades.badge}</span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">{t.habilidades.tituloA}<br />{t.habilidades.tituloB}<span className="text-brand">{t.habilidades.tituloEnfase}</span>{t.habilidades.tituloC}</h2>
            <p className="mb-6 leading-relaxed text-black/55">{t.habilidades.desc}</p>
            <ul className="space-y-3 text-sm">
              {t.habilidades.itens.map((x) => (<li key={x} className="flex items-start gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-brand" /><span className="text-black/70">{x}</span></li>))}
            </ul>
          </div>
          <div className="space-y-3">
            {t.habilidades.exemplos.map((h, i) => (
              <div key={h.titulo} className="lp-anim lp-up rounded-xl border border-black/10 bg-paper p-4 shadow-sm" style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-sm font-semibold">{h.titulo}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${HAB_COR[i] ?? HAB_COR[0]}`}>{h.agente}</span></div>
                <p className="text-xs leading-relaxed text-black/45">{h.linhas}</p>
              </div>
            ))}
            <p className="pt-1 text-center text-[11px] text-black/35">{t.habilidades.exemplosNota}</p>
          </div>
        </div>
      </section>

      {/* ====================== PARA QUALQUER NEGÓCIO ====================== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.verticais.titulo}</h2>
          <p className="mx-auto mb-8 max-w-2xl text-black/50">{t.verticais.subtitulo}</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {t.verticais.lista.map((v) => (<span key={v} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/65">{v}</span>))}
          </div>
        </div>
      </section>

      {/* ====================== TECNOLOGIA ====================== */}
      <section id="tecnologia" className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" /></div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">{t.tecnologia.badge}</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.tecnologia.titulo}</h2>
            <p className="mx-auto max-w-2xl text-white/50">{t.tecnologia.subtitulo}</p>
          </div>
          <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <PipeNode icon={<Bot size={18} />} titulo={t.tecnologia.pipe[0].titulo} sub={t.tecnologia.pipe[0].sub} cor="from-indigo-500 to-violet-600" />
            <PipeConnector />
            <PipeNode icon={<Layers size={18} />} titulo={t.tecnologia.pipe[1].titulo} sub={t.tecnologia.pipe[1].sub} cor="from-emerald-500 to-teal-600" pulso />
            <PipeConnector />
            <PipeNode icon={<Sparkles size={18} />} titulo={t.tecnologia.pipe[2].titulo} sub={t.tecnologia.pipe[2].sub} cor="from-amber-500 to-orange-600" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {t.tecnologia.cards.map((c, i) => (<TechCard key={c.titulo} icon={TECH_ICONS[i]} titulo={c.titulo} desc={c.desc} />))}
          </div>
        </div>
      </section>

      {/* ====================== COMO FUNCIONA ====================== */}
      <section id="como-funciona" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.comoFunciona.titulo}</h2>
            <p className="text-black/50">{t.comoFunciona.subtitulo}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {t.comoFunciona.passos.map((p, i) => (
              <div key={p.n} className="relative rounded-2xl border border-black/10 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">{p.n}</div>
                <h3 className="mb-2 font-semibold">{p.titulo}</h3>
                <p className="text-sm leading-relaxed text-black/55">{p.desc}</p>
                {i < t.comoFunciona.passos.length - 1 && <ChevronRight size={18} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-black/20 md:block" />}
              </div>
            ))}
          </div>
          <div className="mt-14 rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-black/70"><Globe size={16} className="text-brand" />{t.comoFunciona.integracoesTitulo}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {t.comoFunciona.integracoes.map((i) => (
                <div key={i.nome} className="rounded-xl border border-black/8 bg-paper px-3 py-3 text-center transition hover:border-brand/30 hover:shadow-sm">
                  <div className="text-sm font-semibold">{i.nome}</div><div className="mt-0.5 text-[10px] text-black/40">{i.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================== PREÇOS ====================== */}
      <section id="precos" className="border-y border-black/5 bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{t.precos.badge}</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">{t.precos.titulo1}<br />{t.precos.titulo2}</h2>
            <p className="mx-auto max-w-2xl text-black/50">{t.precos.subtitulo}</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {planos.map((p) => (
              <div key={p.nome} className={`relative flex flex-col rounded-2xl border p-7 ${p.destaque ? "border-brand bg-gradient-to-b from-brand/[0.06] to-transparent shadow-xl shadow-brand/10" : "border-black/10 bg-white"}`}>
                {p.destaque && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand-dark px-3 py-1 text-[11px] font-bold text-white shadow">{t.precos.popular}</span>}
                <div className="mb-1 text-sm font-semibold text-black/60">{p.nome}</div>
                <div className="mb-1 flex items-baseline gap-1"><span className="text-sm font-medium text-black/40">{t.precos.moeda}</span><span className="text-5xl font-bold tracking-tight">{p.preco}</span><span className="text-sm text-black/40">{t.precos.por}</span></div>
                <div className="mb-5 text-xs text-black/45">{p.para}</div>
                <div className={`mb-5 rounded-xl px-4 py-3 text-center ${p.destaque ? "bg-brand/10" : "bg-paper"}`}><span className="text-lg font-bold">{p.creditos}</span><span className="text-sm text-black/55"> {t.precos.creditosLabel}</span></div>
                <ul className="mb-7 space-y-2.5 text-sm">
                  {[...t.precos.featuresBase, ...p.extras].map((f) => (<li key={f} className="flex items-start gap-2"><Check size={15} className={`mt-0.5 shrink-0 ${p.destaque ? "text-brand" : "text-black/30"}`} /><span className="text-black/65">{f}</span></li>))}
                </ul>
                <Link href="/login" className={`mt-auto rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${p.destaque ? "bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/25 hover:shadow-brand/40" : "border border-black/15 text-ink hover:bg-black/5"}`}>{t.precos.ctaPrefix} {p.nome}</Link>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-2 rounded-2xl border border-dashed border-black/15 bg-paper px-6 py-5 text-center sm:flex-row sm:text-left">
            <Wallet size={20} className="shrink-0 text-brand" />
            <p className="text-sm text-black/60"><strong>{t.precos.packTitulo}</strong>{t.precos.packTexto}</p>
          </div>
          <p className="mt-6 text-center text-xs text-black/40"><Clock size={12} className="mr-1 inline" />{t.precos.cancelNota}</p>
        </div>
      </section>

      {/* ====================== FAQ ====================== */}
      <section id="faq" className="px-6 py-24">
        <script type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: t.faq.itens.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }) }} />
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center"><h2 className="mb-3 text-3xl font-bold tracking-tight">{t.faq.titulo}</h2><p className="text-black/50">{t.faq.subtitulo}</p></div>
          <div className="space-y-3">
            {t.faq.itens.map((f) => (
              <details key={f.q} className="group rounded-xl border border-black/10 bg-white open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">{f.q}<ChevronRight size={16} className="shrink-0 text-black/30 transition-transform group-open:rotate-90" /></summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-black/55">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== CTA FINAL ====================== */}
      <section className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0"><div className="lp-anim lp-blob absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-[110px]" /></div>
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">{t.ctaFinal.titulo1}<br />{t.ctaFinal.titulo2}</h2>
          <p className="mx-auto mb-9 max-w-lg text-white/55">{t.ctaFinal.subtitulo}</p>
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-9 py-4 text-sm font-semibold shadow-lg shadow-brand/30 transition hover:shadow-brand/50">
            {t.ctaFinal.cta} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-4 text-xs text-white/35">{t.ctaFinal.nota}</p>
        </div>
      </section>

      {/* ====================== FOOTER ====================== */}
      <footer className="border-t border-white/10 bg-[#0a0a1f] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white"><Logo size={15} /></span>TeamAgents
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            {t.footer.links.map((l) => (<a key={l.href} href={l.href} className="transition hover:text-white/70">{l.label}</a>))}
            <Link href="/blog" className="transition hover:text-white/70">{t.footer.blog}</Link>
            <Link href={locale === "en" ? "/en/privacidade" : "/privacidade"} className="transition hover:text-white/70">{t.footer.privacidade}</Link>
            <Link href="/login" className="transition hover:text-white/70">{t.footer.entrar}</Link>
          </div>
          <span className="text-xs text-white/30">© {new Date().getFullYear()} TeamAgents · Bitzen. {t.footer.rights}</span>
        </div>
      </footer>

      <style>{`
        @keyframes lp-up{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        .lp-up{opacity:0;animation:lp-up .7s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes lp-blob{0%,100%{transform:translate(-50%,0) scale(1)}50%{transform:translate(-46%,4%) scale(1.08)}}
        .lp-blob{animation:lp-blob 9s ease-in-out infinite}
        @keyframes lp-blob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-4%,-6%) scale(1.1)}}
        .lp-blob2{animation:lp-blob2 11s ease-in-out infinite}
        @keyframes lp-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .lp-marquee{animation:lp-marquee 36s linear infinite}
        .lp-marquee-mask{mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
        @keyframes lp-ping{75%,100%{transform:scale(2.2);opacity:0}}
        .lp-ping{animation:lp-ping 1.6s cubic-bezier(0,0,.2,1) infinite}
        @keyframes lp-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
        .lp-shimmer{animation:lp-shimmer 2.4s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.lp-anim{animation:none!important;opacity:1!important}}
      `}</style>
    </div>
  );
}

/* ============================== Componentes ============================== */

type Dict = (typeof landingCopy)[Locale];

function SeletorAgentes({ t }: { t: Dict }) {
  const [sel, setSel] = useState<string>(t.seletor.agentes[0].id);
  const atual = t.seletor.agentes.find((a) => a.id === sel) ?? t.seletor.agentes[0];
  return (
    <section className="border-y border-black/5 bg-paper px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">{t.seletor.badge}</span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t.seletor.titulo}</h2>
          <p className="mx-auto mt-2 max-w-xl text-black/50">{t.seletor.subtitulo}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {t.seletor.agentes.map((a) => {
            const on = a.id === sel;
            const meta = SEL_META[a.id] ?? SEL_META.sdr;
            return (
              <button key={a.id} type="button" onClick={() => setSel(a.id)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${on ? "border-brand bg-white shadow-lg shadow-brand/10 ring-1 ring-brand/30" : "border-black/10 bg-white/60 hover:border-brand/30 hover:bg-white"}`}>
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-black/8 bg-paper">{meta.icon}</span>
                <span className="text-sm font-bold">{a.nome}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.tagCor}`}>{a.chip}</span>
              </button>
            );
          })}
        </div>
        <div key={atual.id} className="lp-anim lp-up mt-6 rounded-2xl border border-black/10 bg-white p-7 shadow-sm">
          <h3 className="max-w-2xl text-2xl font-bold leading-snug tracking-tight">{atual.headline}</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {atual.bullets.map((b) => (<li key={b} className="flex items-start gap-2 text-sm text-black/70"><Check size={16} className="mt-0.5 shrink-0 text-brand" />{b}</li>))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-brand/40">{t.seletor.ctaWant} <ArrowRight size={16} /></Link>
            <a href="#agentes" className="flex items-center justify-center gap-1.5 rounded-xl border border-black/15 px-7 py-3 text-sm font-medium text-black/70 transition hover:border-black/30">{t.seletor.ctaAll} <ChevronRight size={14} /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMedia({ t }: { t: Dict }) {
  const [videoPronto, setVideoPronto] = useState(false);
  return (
    <div className="lp-anim lp-up [animation-delay:.2s]">
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video className={`${videoPronto ? "block" : "hidden"} w-full rounded-xl`} src="/demo.mp4" autoPlay muted loop playsInline preload="metadata" onCanPlay={() => setVideoPronto(true)} />
        {!videoPronto && <OpsMockup t={t} />}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/30">{videoPronto ? t.hero.mediaCaptionReal : t.hero.mediaCaptionMock}</p>
    </div>
  );
}

function OpsMockup({ t }: { t: Dict }) {
  return (
    <div className="rounded-xl bg-[#0e0e26]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <span className="relative flex h-2 w-2"><span className="lp-anim lp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
          {t.ops.titulo}
        </span>
        <span className="text-[10px] text-white/35">teamagents</span>
      </div>
      <div className="space-y-2.5 p-4">
        {t.ops.rows.map((r, i) => (
          <OpsRow key={i} delay={`${0.5 + i * 0.6}s`} icon={OPS_ICONS[i]} nome={r.nome} acao={r.acao} badge={r.badge} badgeCor={OPS_BADGE_COR[i] ?? OPS_BADGE_COR[0]} />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-[10px] text-white/35">
        <span className="flex items-center gap-1.5"><Cpu size={11} />{t.ops.footerLeft}</span>
        <span className="flex items-center gap-1.5"><Shield size={11} />{t.ops.footerRight}</span>
      </div>
    </div>
  );
}

function OpsRow({ delay, icon, nome, acao, badge, badgeCor }: { delay: string; icon: React.ReactNode; nome: string; acao: string; badge: string; badgeCor: string }) {
  return (
    <div className="lp-anim lp-up rounded-lg border border-white/8 bg-white/[0.03] p-3" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/8">{icon}</span>
          <div className="min-w-0"><div className="text-xs font-semibold text-white/85">{nome}</div><div className="truncate text-[11px] text-white/40">{acao}</div></div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCor}`}>{badge}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className="lp-anim lp-shimmer h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent" /></div>
    </div>
  );
}

function AgentCard({ icon, tag, tagCor, nome, desc, checks, children }: { icon: React.ReactNode; tag: string; tagCor: string; nome: string; desc: string; checks: string[]; children: React.ReactNode }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-xl hover:shadow-brand/5 lg:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl border border-black/8 bg-paper shadow-sm">{icon}</span><h3 className="text-lg font-bold tracking-tight">{nome}</h3></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tagCor}`}>{tag}</span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-black/55">{desc}</p>
      <div className="mb-5 rounded-xl border border-black/8 bg-paper p-3.5">{children}</div>
      <ul className="mt-auto space-y-2 text-xs">
        {checks.map((c) => (<li key={c} className="flex items-center gap-2 text-black/65"><CheckCircle size={13} className="shrink-0 text-brand" />{c}</li>))}
      </ul>
    </div>
  );
}

function ChatBubble({ lado, delay, children }: { lado: "lead" | "agente"; delay: string; children: React.ReactNode }) {
  const isAgente = lado === "agente";
  return (
    <div className={`lp-anim lp-up flex ${isAgente ? "justify-end" : "justify-start"}`} style={{ animationDelay: delay }}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed ${isAgente ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm border border-black/8 bg-white text-black/75"}`}>{children}</div>
    </div>
  );
}

function GestaoCard({ icon, titulo, desc }: { icon: React.ReactNode; titulo: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.06]">
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white/8">{icon}</span>
      <h3 className="mb-1.5 text-sm font-semibold">{titulo}</h3>
      <p className="text-xs leading-relaxed text-white/45">{desc}</p>
    </div>
  );
}

function PipeNode({ icon, titulo, sub, cor, pulso }: { icon: React.ReactNode; titulo: string; sub: string; cor: string; pulso?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${cor} shadow-lg`}>{icon}{pulso && <span className="lp-anim lp-ping absolute inset-0 rounded-2xl bg-emerald-400/40" />}</span>
      <div><div className="text-sm font-semibold">{titulo}</div><div className="text-[11px] text-white/40">{sub}</div></div>
    </div>
  );
}

function TechCard({ icon, titulo, desc }: { icon: React.ReactNode; titulo: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/20 hover:bg-white/[0.06]">
      <span className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white/8">{icon}</span>
      <h3 className="mb-1.5 text-sm font-semibold">{titulo}</h3>
      <p className="text-xs leading-relaxed text-white/45">{desc}</p>
    </div>
  );
}

function PipeConnector() {
  return <div className="h-8 w-px bg-gradient-to-b from-white/5 via-white/25 to-white/5 sm:h-px sm:w-full sm:max-w-[70px] sm:bg-gradient-to-r" />;
}
