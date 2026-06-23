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

/* ============================== Dados ============================== */

const STATS = [
  { valor: "13", rotulo: "agentes especialistas" },
  { valor: "24/7", rotulo: "trabalhando pela empresa" },
  { valor: "< 1 min", rotulo: "para responder no WhatsApp" },
  { valor: "1", rotulo: "fração do custo de contratar" },
];

const MARQUEE = [
  "Clientes atendidos no WhatsApp em segundos",
  "Reuniões agendadas sozinhas",
  "Plano de redução de custos pronto",
  "Contrato revisado antes de assinar",
  "Anúncios e posts de alta conversão",
  "Planilha analisada e relatório em PDF",
  "Projetos organizados por departamento",
  "Powered by Claude (Anthropic)",
];

const PASSOS = [
  {
    n: "1",
    titulo: "Conecte seus canais",
    desc: "WhatsApp em 1 clique (QR Code), e também Gmail, Instagram e Facebook em poucos cliques. Sem instalar nada.",
  },
  {
    n: "2",
    titulo: "Ensine a sua empresa",
    desc: "Cadastre Habilidades — seus produtos, valores, tom de voz, políticas — e cada agente passa a trabalhar com o contexto do seu negócio.",
  },
  {
    n: "3",
    titulo: "Deixe a equipe de IA trabalhar",
    desc: "Os agentes atendem clientes, geram conteúdo, analisam documentos e organizam a gestão — enquanto você toca o negócio.",
  },
];

const INTEGRACOES = [
  { nome: "WhatsApp", desc: "atendimento + relatórios" },
  { nome: "Gmail", desc: "Agente Executivo" },
  { nome: "Facebook", desc: "publicação direta" },
  { nome: "Instagram", desc: "publicação direta" },
  { nome: "Discord", desc: "publicação direta" },
  { nome: "Cal.com", desc: "agenda automática" },
  { nome: "Stripe", desc: "assinatura segura" },
];

// Verticais como prova/uso — TeamAgents serve qualquer negócio.
const VERTICAIS = [
  "Serviços & atendimento", "Contabilidade", "Advocacia", "E-commerce",
  "Agências de marketing", "Clínicas & estética", "Imobiliárias", "Consultorias",
];

type PlanoLanding = {
  nome: string;
  preco: string;
  creditos: string;
  destaque: boolean;
  para: string;
  extras: string[];
};

// Copy de marketing por plano (os números vêm da BD via /planos/publicos).
const PLANO_COPY: Record<string, { para: string; extras: string[] }> = {
  Starter: {
    para: "Para começar com a sua equipe de IA",
    extras: ["≈ 500 operações/mês (atendimentos, análises…)", "Todos os agentes incluídos", "Upgrade quando crescer"],
  },
  Pro: {
    para: "Para empresas em ritmo de crescimento",
    extras: ["≈ 2.000 operações/mês", "Melhor custo por operação", "Gestão por projetos sem limite"],
  },
  Scale: {
    para: "Para alto volume e várias frentes",
    extras: ["≈ 8.000 operações/mês", "O menor custo por operação", "Ideal para times e múltiplas áreas"],
  },
};

const PLANOS_FALLBACK: PlanoLanding[] = [
  { nome: "Starter", preco: "179", creditos: "500", destaque: false, ...PLANO_COPY.Starter },
  { nome: "Pro", preco: "329", creditos: "2.000", destaque: true, ...PLANO_COPY.Pro },
  { nome: "Scale", preco: "999", creditos: "8.000", destaque: false, ...PLANO_COPY.Scale },
];

function formatarPreco(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ",");
}

const FAQ = [
  {
    q: "O que é o TeamAgents, em uma frase?",
    a: "É uma equipe de agentes de IA para a sua empresa: uns atendem e captam clientes no WhatsApp, outros cuidam da gestão (financeiro, jurídico, RH, projetos, estratégia) — todos conhecendo o seu negócio e trabalhando 24/7, por uma fração do custo de contratar.",
  },
  {
    q: "Serve para o meu tipo de negócio?",
    a: "Sim. É horizontal: serviços, comércio, agências, contabilidade, advocacia, clínicas, consultorias. Você cadastra as Habilidades da sua empresa e os agentes se adaptam ao seu contexto, produtos e tom de voz.",
  },
  {
    q: "Os agentes conhecem a minha empresa?",
    a: "Conhecem o que você ensinar. Em Habilidades você cadastra produtos, valores, políticas, objeções e tom de voz; e dentro de cada projeto você anexa documentos (PDF, Excel, Word) que viram contexto compartilhado. Aí as respostas saem com a cara do seu negócio.",
  },
  {
    q: "Como funciona a parte de gestão (projetos)?",
    a: "No menu Gestão você organiza Empresa › Departamentos › Projetos. Cada projeto tem o seu time de agentes e um contexto próprio (briefing + documentos). Você conversa com cada especialista, e salva os melhores resultados como relatórios/planos de ação em PDF.",
  },
  {
    q: "Como conecto o WhatsApp?",
    a: "Em 1 clique: você aperta “Ligar WhatsApp”, lê um QR Code e pronto — o agente começa a atender em conversa natural. Sem instalar nada, sem número novo.",
  },
  {
    q: "O que é um crédito?",
    a: "É a unidade de trabalho dos agentes. Cada operação (um atendimento, uma análise de documento, um relatório) consome créditos conforme o custo real de IA — você paga pelo que os agentes realmente fazem, com a margem embutida.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, com um clique dentro da própria app — sem emails, sem retenção forçada. Você mantém o acesso até o fim do período já pago.",
  },
];

const NAV_LINKS = [
  { href: "#agentes", label: "Agentes" },
  { href: "#gestao", label: "Gestão" },
  { href: "#tecnologia", label: "Tecnologia" },
  { href: "#precos", label: "Preços" },
  { href: "#faq", label: "FAQ" },
];

/* ============================== Página ============================== */

export default function LandingPage() {
  const [planos, setPlanos] = useState<PlanoLanding[]>(PLANOS_FALLBACK);
  const [menuMobile, setMenuMobile] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/planos/publicos`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { nome: string; creditos_mensais: number; preco: number; ordem: number }[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const meio = Math.floor(rows.length / 2);
        setPlanos(
          rows.map((p, i) => {
            const copy = PLANO_COPY[p.nome];
            const creditos = Number(p.creditos_mensais).toLocaleString("pt-BR");
            return {
              nome: p.nome,
              preco: formatarPreco(Number(p.preco)),
              creditos,
              destaque: p.nome === "Pro" || (!rows.some((r) => r.nome === "Pro") && i === meio),
              para: copy?.para ?? "Todos os agentes incluídos",
              extras: copy?.extras ?? [`≈ ${creditos} operações/mês`],
            };
          }),
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ====================== NAV ====================== */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1f]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white">
              <Logo size={18} />
            </span>
            <span className="font-semibold tracking-tight">TeamAgents</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition hover:text-white">{l.label}</a>
            ))}
            <Link href="/blog" className="transition hover:text-white">Blog</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0a0a1f] transition hover:bg-white/90">
              Entrar <ArrowRight size={14} />
            </Link>
            <button type="button" onClick={() => setMenuMobile((v) => !v)} aria-label={menuMobile ? "Fechar menu" : "Abrir menu"}
              className="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 md:hidden">
              {menuMobile ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuMobile && (
          <div className="border-t border-white/10 bg-[#0a0a1f] px-6 py-3 md:hidden">
            <div className="flex flex-col">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setMenuMobile(false)}
                  className="rounded-lg px-2 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">{l.label}</a>
              ))}
              <Link href="/blog" onClick={() => setMenuMobile(false)} className="rounded-lg px-2 py-2.5 text-sm text-white/70 transition hover:bg-white/5 hover:text-white">Blog</Link>
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
              <Sparkles size={13} className="text-amber-300" />
              A equipe de IA da sua empresa
            </div>

            <h1 className="lp-anim lp-up mb-6 text-3xl font-bold leading-[1.1] tracking-tight [animation-delay:.08s] sm:text-4xl md:text-6xl md:leading-[1.08]">
              Uma equipe inteira de IA.
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                Pelo custo de um café.
              </span>
            </h1>

            <p className="lp-anim lp-up mb-9 max-w-xl text-lg leading-relaxed text-white/60 [animation-delay:.16s]">
              O TeamAgents <strong className="text-white/85">atende e capta seus clientes no WhatsApp</strong> e ainda te dá
              <strong className="text-white/85"> especialistas de IA</strong> em finanças, jurídico, projetos, estratégia e mais —
              que conhecem o seu negócio e trabalham 24/7.
            </p>

            <div className="lp-anim lp-up flex flex-col gap-3 [animation-delay:.24s] sm:flex-row">
              <Link href="/login" className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-7 py-3.5 text-sm font-semibold shadow-lg shadow-brand/30 transition hover:shadow-brand/50">
                Montar minha equipe de IA
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#agentes" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-medium text-white/75 transition hover:border-white/35 hover:text-white">
                Conhecer os agentes <ChevronRight size={14} />
              </a>
            </div>

            <div className="lp-anim lp-up mt-12 grid grid-cols-2 gap-x-8 gap-y-6 [animation-delay:.32s] sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.rotulo}>
                  <div className="text-2xl font-bold">{s.valor}</div>
                  <div className="mt-0.5 text-xs leading-snug text-white/45">{s.rotulo}</div>
                </div>
              ))}
            </div>
          </div>

          <HeroMedia />
        </div>

        <div className="relative border-t border-white/8 bg-white/[0.03] py-3.5">
          <div className="lp-marquee-mask overflow-hidden">
            <div className="lp-anim lp-marquee flex w-max gap-10 whitespace-nowrap text-xs font-medium text-white/40">
              {[...MARQUEE, ...MARQUEE].map((m, i) => (
                <span key={i} className="flex items-center gap-2"><Zap size={11} className="text-brand" />{m}</span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ====================== DUAS FRENTES ====================== */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Duas frentes. Uma plataforma.</h2>
            <p className="mx-auto max-w-2xl text-black/50">Capte e atenda clientes — e cuide da gestão do negócio. Tudo com agentes que conhecem a sua empresa.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white p-7">
              <span className="mb-3 inline-flex rounded-xl bg-emerald-100 p-2.5 text-emerald-700"><MessageCircle size={20} /></span>
              <h3 className="mb-2 text-xl font-bold tracking-tight">Captar &amp; Atender</h3>
              <p className="mb-4 text-sm leading-relaxed text-black/55">Quem chega no WhatsApp é atendido em segundos, qualificado e agendado. Anúncios e posts prontos, e relatórios do que rendeu.</p>
              <ul className="space-y-2 text-sm">
                {["SDR atende e agenda 24/7", "Copywriting gera anúncios e posts", "Link e QR de captação levam o cliente pro WhatsApp"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-black/70"><Check size={15} className="shrink-0 text-emerald-600" /> {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-7">
              <span className="mb-3 inline-flex rounded-xl bg-brand/10 p-2.5 text-brand"><FolderKanban size={20} /></span>
              <h3 className="mb-2 text-xl font-bold tracking-tight">Gerir &amp; Decidir</h3>
              <p className="mb-4 text-sm leading-relaxed text-black/55">Especialistas de IA para as áreas da empresa — que leem seus documentos, analisam e entregam planos de ação por projeto.</p>
              <ul className="space-y-2 text-sm">
                {["10 especialistas (financeiro, jurídico, RH…)", "Gestão por departamentos e projetos", "Análise de documentos + relatórios em PDF"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-black/70"><Check size={15} className="shrink-0 text-brand" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== SELETOR DE AGENTES ====================== */}
      <SeletorAgentes />

      {/* ====================== AGENTES (captação) ====================== */}
      <section id="agentes" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">A frente de relacionamento</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Atendimento, marketing e bastidores — no automático</h2>
            <p className="mx-auto max-w-2xl text-black/50">Os agentes que captam e convertem a demanda que você já gera. Cada um domina a sua função.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AgentCard icon={<MessageCircle size={20} className="text-emerald-600" />} tag="WhatsApp · Atendimento" tagCor="bg-emerald-100 text-emerald-700"
              nome="Agente SDR" desc="Atende cada cliente em segundos, entende o que ele quer, responde preço e faz o agendamento automático — ou passa pra você quando faz sentido."
              checks={["Atendimento automático 24/7", "Agendamento direto na sua agenda", "Histórico completo por cliente"]}>
              <div className="space-y-2 text-xs">
                <ChatBubble lado="lead" delay=".2s">Vi o anúncio de vocês. Quanto fica?</ChatBubble>
                <ChatBubble lado="agente" delay=".7s">Oi! 😊 Te explico tudo. Me conta rapidinho o que você precisa?</ChatBubble>
                <ChatBubble lado="lead" delay="1.2s">Quero contratar o serviço</ChatBubble>
                <ChatBubble lado="agente" delay="1.7s">Perfeito! Tenho horário quinta às 10h ou sexta às 14h — qual prefere?</ChatBubble>
                <div className="lp-anim lp-up flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-emerald-700 [animation-delay:2.2s]">
                  <CheckCircle size={13} /> Reunião agendada · lead qualificado
                </div>
              </div>
            </AgentCard>

            <AgentCard icon={<Megaphone size={20} className="text-violet-600" />} tag="Anúncios · Conteúdo" tagCor="bg-violet-100 text-violet-700"
              nome="Agente de Copywriting" desc="Você dá o produto e o público; ele devolve anúncios e posts de alta conversão, com gatilho, dor e desejo mapeados — e publica direto no Instagram e Facebook."
              checks={["Variações prontas para publicar", "Publica no Instagram e Facebook", "Usa as Habilidades da sua empresa"]}>
              <div className="rounded-lg border border-violet-200 bg-white p-3.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-500">Anúncio — Dor</div>
                <p className="text-sm font-semibold leading-snug">“Cansado de perder cliente por demora no atendimento?”</p>
                <p className="mt-1.5 text-xs leading-relaxed text-black/55">Responda cada lead em segundos, 24/7. Fale com a gente no WhatsApp. 👇</p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium">
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">gatilho: urgência</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-black/60">palavra-chave: ATENDER</span>
                </div>
              </div>
            </AgentCard>

            <AgentCard icon={<Mail size={20} className="text-sky-600" />} tag="Email & Bastidores" tagCor="bg-sky-100 text-sky-700"
              nome="Agente Executivo" desc="Conecte o Gmail e ele resume o que importa nos emails — pedidos, boletos, fornecedores — em prioridades, ações e decisões. Sem você abrir a caixa de entrada."
              checks={["Tarefas com frequência e horário", "Resume só o que você pedir", "Prioridades, ações e decisões"]}>
              <div className="rounded-lg border border-sky-200 bg-white p-3.5 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-black/70">8 emails → 1 síntese executiva</span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">07:00</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2"><span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">alta</span><span className="text-black/70">Fornecedor confirma entrega sexta</span></div>
                  <div className="flex items-center gap-2"><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">média</span><span className="text-black/70">Boleto a vencer — conferir valor</span></div>
                </div>
              </div>
            </AgentCard>

          </div>

          {/* 10 especialistas de gestão */}
          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-1 text-sm font-semibold">+ 10 especialistas de gestão, prontos para conversar</div>
            <p className="mb-4 text-sm text-black/50">Cada um com skills avançadas e o contexto da sua empresa. Anexe documentos e peça análises.</p>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              {[["Financeiro", Wallet], ["Jurídico", Scale], ["Suporte", Bot], ["Produto", Layers], ["RH / Pessoas", Users],
                ["Auditoria", Shield], ["Projetos", FolderKanban], ["Estratégia", Target], ["Growth", TrendingUp], ["Operações", Workflow]].map(([n, Ico]) => {
                const I = Ico as typeof Wallet;
                return (
                  <span key={n as string} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-paper px-3 py-1.5 text-black/65">
                    <I size={13} className="text-brand" /> {n as string}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ====================== GESTÃO (dark) ====================== */}
      <section id="gestao" className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" /></div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">Novo · Gestão</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Organize a empresa por projetos</h2>
            <p className="mx-auto max-w-2xl text-white/50">Empresa › Departamentos › Projetos. Cada projeto tem o seu time de agentes e o seu contexto — e vira relatórios prontos para apresentar.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <GestaoCard icon={<Layers size={18} className="text-indigo-300" />} titulo="Escolha os agentes" desc="A empresa ativa os agentes que usa; cada departamento e projeto monta o seu time." />
            <GestaoCard icon={<FileText size={18} className="text-emerald-300" />} titulo="Contexto compartilhado" desc="Briefing + documentos (PDF, Excel, Word) que todos os agentes do projeto leem." />
            <GestaoCard icon={<MessageCircle size={18} className="text-sky-300" />} titulo="Converse com cada um" desc="Você é o maestro: fala com o especialista que quiser, com o histórico salvo por projeto." />
            <GestaoCard icon={<FolderKanban size={18} className="text-amber-300" />} titulo="Relatórios & planos" desc="Salve os melhores resultados como relatórios/planos de ação e baixe em PDF." />
          </div>
        </div>
      </section>

      {/* ====================== HABILIDADES ====================== */}
      <section className="border-b border-black/5 bg-white px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Habilidades</span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Agentes que conhecem<br />a <span className="text-brand">sua</span> empresa.</h2>
            <p className="mb-6 leading-relaxed text-black/55">IA genérica dá respostas genéricas. No TeamAgents você cadastra <strong>Habilidades</strong> — tom de voz, produtos e valores, políticas, objeções comuns — e atribui a cada agente só o que ele precisa.</p>
            <ul className="space-y-3 text-sm">
              {["O atendimento responde com o seu tom e os valores certos", "O Copywriting escreve como a sua empresa fala", "Os especialistas analisam com o contexto do seu negócio", "Você atualiza uma vez — todos os agentes acompanham"].map((t) => (
                <li key={t} className="flex items-start gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-brand" /><span className="text-black/70">{t}</span></li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            {[
              { titulo: "Tom de voz da empresa", agente: "Global", cor: "bg-black/5 text-black/60", linhas: "Próximo e direto, sem promessas exageradas. Tratamos o cliente por “você”…" },
              { titulo: "Produtos, preços e objeções", agente: "Agente SDR", cor: "bg-emerald-100 text-emerald-700", linhas: "Plano X a partir de R$… Se achar caro, explicar valor e parcelamento…" },
              { titulo: "Política financeira e metas", agente: "Agente Financeiro", cor: "bg-emerald-100 text-emerald-700", linhas: "Margem-alvo 20%, ticket médio R$…, cortar custos sem afetar qualidade…" },
            ].map((h, i) => (
              <div key={h.titulo} className="lp-anim lp-up rounded-xl border border-black/10 bg-paper p-4 shadow-sm" style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="mb-1.5 flex items-center justify-between gap-3"><span className="text-sm font-semibold">{h.titulo}</span><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${h.cor}`}>{h.agente}</span></div>
                <p className="text-xs leading-relaxed text-black/45">{h.linhas}</p>
              </div>
            ))}
            <p className="pt-1 text-center text-[11px] text-black/35">Exemplos de Habilidades — cadastre as suas em minutos.</p>
          </div>
        </div>
      </section>

      {/* ====================== PARA QUALQUER NEGÓCIO ====================== */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Feito para qualquer negócio</h2>
          <p className="mx-auto mb-8 max-w-2xl text-black/50">Não é de um nicho só. Você ensina a sua empresa e os agentes se adaptam ao seu contexto.</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {VERTICAIS.map((v) => (
              <span key={v} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-black/65">{v}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== TECNOLOGIA (dark) ====================== */}
      <section id="tecnologia" className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0"><div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" /></div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">Engenharia, não mágica</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Arquitetura de orquestração</h2>
            <p className="mx-auto max-w-2xl text-white/50">Não é “um chatbot”. É um sistema multi-agente: o modelo certo para cada tarefa, com o contexto da sua empresa.</p>
          </div>
          <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <PipeNode icon={<Bot size={18} />} titulo="Orquestrador" sub="planeja e divide" cor="from-indigo-500 to-violet-600" />
            <PipeConnector />
            <PipeNode icon={<Layers size={18} />} titulo="Especialistas" sub="executam em paralelo" cor="from-emerald-500 to-teal-600" pulso />
            <PipeConnector />
            <PipeNode icon={<Sparkles size={18} />} titulo="Sintetizador" sub="consolida o resultado" cor="from-amber-500 to-orange-600" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <TechCard icon={<Cpu size={18} className="text-indigo-300" />} titulo="O modelo certo por tarefa" desc="Claude Opus para raciocínio, Haiku para velocidade. Inteligência máxima, custo mínimo." />
            <TechCard icon={<Calendar size={18} className="text-emerald-300" />} titulo="Trabalha como gente" desc="Tarefas no dia, hora e fuso que você escolher. Atende e analisa sem você estar online." />
            <TechCard icon={<Wallet size={18} className="text-amber-300" />} titulo="Custo auditado por token" desc="Cada operação registra o custo real do modelo usado. Você vê onde cada crédito foi gasto." />
            <TechCard icon={<Shield size={18} className="text-sky-300" />} titulo="Isolamento por empresa" desc="Seus dados, tokens e conexões ficam isolados por empresa, com autenticação em tudo." />
          </div>
        </div>
      </section>

      {/* ====================== COMO FUNCIONA ====================== */}
      <section id="como-funciona" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Funcionando em minutos</h2>
            <p className="text-black/50">Sem implementação, sem consultoria, sem semanas de onboarding.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <div key={p.n} className="relative rounded-2xl border border-black/10 bg-white p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">{p.n}</div>
                <h3 className="mb-2 font-semibold">{p.titulo}</h3>
                <p className="text-sm leading-relaxed text-black/55">{p.desc}</p>
                {i < PASSOS.length - 1 && <ChevronRight size={18} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-black/20 md:block" />}
              </div>
            ))}
          </div>
          <div className="mt-14 rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-black/70"><Globe size={16} className="text-brand" />Liga-se ao que você já usa</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {INTEGRACOES.map((i) => (
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
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Preços simples</span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">Menos que um estagiário.<br />O trabalho de uma equipe inteira.</h2>
            <p className="mx-auto max-w-2xl text-black/50">Todos os planos incluem <strong>todos os agentes</strong>, a Gestão por projetos, as integrações e as Habilidades. Só os créditos mensais mudam.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {planos.map((p) => (
              <div key={p.nome} className={`relative flex flex-col rounded-2xl border p-7 ${p.destaque ? "border-brand bg-gradient-to-b from-brand/[0.06] to-transparent shadow-xl shadow-brand/10" : "border-black/10 bg-white"}`}>
                {p.destaque && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand-dark px-3 py-1 text-[11px] font-bold text-white shadow">MAIS POPULAR</span>}
                <div className="mb-1 text-sm font-semibold text-black/60">{p.nome}</div>
                <div className="mb-1 flex items-baseline gap-1"><span className="text-sm font-medium text-black/40">R$</span><span className="text-5xl font-bold tracking-tight">{p.preco}</span><span className="text-sm text-black/40">/mês</span></div>
                <div className="mb-5 text-xs text-black/45">{p.para}</div>
                <div className={`mb-5 rounded-xl px-4 py-3 text-center ${p.destaque ? "bg-brand/10" : "bg-paper"}`}><span className="text-lg font-bold">{p.creditos}</span><span className="text-sm text-black/55"> créditos/mês</span></div>
                <ul className="mb-7 space-y-2.5 text-sm">
                  {["Todos os 13 agentes", "Gestão por projetos", "Habilidades ilimitadas", "Análise de documentos", ...p.extras].map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check size={15} className={`mt-0.5 shrink-0 ${p.destaque ? "text-brand" : "text-black/30"}`} /><span className="text-black/65">{f}</span></li>
                  ))}
                </ul>
                <Link href="/login" className={`mt-auto rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${p.destaque ? "bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/25 hover:shadow-brand/40" : "border border-black/15 text-ink hover:bg-black/5"}`}>Começar com o {p.nome}</Link>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-2 rounded-2xl border border-dashed border-black/15 bg-paper px-6 py-5 text-center sm:flex-row sm:text-left">
            <Wallet size={20} className="shrink-0 text-brand" />
            <p className="text-sm text-black/60"><strong>Pico de trabalho?</strong> Compre pacotes avulsos de créditos dentro da app — pagamento único, <strong>nunca expiram</strong> e só são usados depois da mensalidade.</p>
          </div>
          <p className="mt-6 text-center text-xs text-black/40"><Clock size={12} className="mr-1 inline" />Cancele quando quiser, com um clique, dentro da app. Sem fidelização.</p>
        </div>
      </section>

      {/* ====================== FAQ ====================== */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center"><h2 className="mb-3 text-3xl font-bold tracking-tight">Perguntas frequentes</h2><p className="text-black/50">Tudo o que costumam perguntar antes de começar.</p></div>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-black/10 bg-white open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">{f.q}<ChevronRight size={16} className="shrink-0 text-black/30 transition-transform group-open:rotate-90" /></summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-black/55">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== CTA FINAL (dark) ====================== */}
      <section className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0"><div className="lp-anim lp-blob absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-[110px]" /></div>
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">Sua equipe de IA<br />começa hoje.</h2>
          <p className="mx-auto mb-9 max-w-lg text-white/55">Conecte o WhatsApp em 1 clique, ative os agentes que precisa e veja a equipe trabalhar — atendendo clientes e cuidando da gestão.</p>
          <Link href="/login" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-9 py-4 text-sm font-semibold shadow-lg shadow-brand/30 transition hover:shadow-brand/50">
            Montar minha equipe de IA <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-4 text-xs text-white/35">A partir de R$ 179/mês · cancele quando quiser</p>
        </div>
      </section>

      {/* ====================== FOOTER ====================== */}
      <footer className="border-t border-white/10 bg-[#0a0a1f] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white"><Logo size={15} /></span>TeamAgents
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <a href="#agentes" className="transition hover:text-white/70">Agentes</a>
            <a href="#gestao" className="transition hover:text-white/70">Gestão</a>
            <a href="#precos" className="transition hover:text-white/70">Preços</a>
            <Link href="/blog" className="transition hover:text-white/70">Blog</Link>
            <Link href="/privacidade" className="transition hover:text-white/70">Privacidade</Link>
            <Link href="/login" className="transition hover:text-white/70">Entrar</Link>
          </div>
          <span className="text-xs text-white/30">© {new Date().getFullYear()} TeamAgents · Bitzen. Todos os direitos reservados.</span>
        </div>
      </footer>

      {/* ====================== Animações ====================== */}
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
        @keyframes lp-bar{0%{transform:scaleY(0)}100%{transform:scaleY(1)}}
        .lp-bar{transform-origin:bottom;animation:lp-bar .8s cubic-bezier(.16,1,.3,1) both}
        @keyframes lp-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
        .lp-shimmer{animation:lp-shimmer 2.4s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.lp-anim{animation:none!important;opacity:1!important}}
      `}</style>
    </div>
  );
}

/* ============================== Componentes ============================== */

const SEL_AGENTES = [
  { id: "sdr", icon: <MessageCircle size={20} className="text-emerald-600" />, tagCor: "bg-emerald-100 text-emerald-700", nome: "Atendimento", chip: "WhatsApp · SDR",
    headline: "O atendente que nunca dorme — responde, qualifica e agenda 24/7.", bullets: ["Responde cada mensagem em segundos", "Qualifica e contorna objeções", "Agenda sozinho na sua agenda"] },
  { id: "copy", icon: <Megaphone size={20} className="text-violet-600" />, tagCor: "bg-violet-100 text-violet-700", nome: "Marketing", chip: "Anúncios & Posts",
    headline: "O redator que cria anúncios e posts com a voz da sua empresa.", bullets: ["Variações de alta conversão", "Publica no Instagram e Facebook", "Gera link/QR que traz o cliente"] },
  { id: "fin", icon: <Wallet size={20} className="text-emerald-600" />, tagCor: "bg-emerald-100 text-emerald-700", nome: "Financeiro", chip: "Gestão · Finanças",
    headline: "O CFO de bolso: precificação, fluxo de caixa e corte de custos.", bullets: ["Analisa sua planilha de custos", "Simula preço e margem", "Plano de ação em PDF"] },
  { id: "jur", icon: <Scale size={20} className="text-indigo-600" />, tagCor: "bg-indigo-100 text-indigo-700", nome: "Jurídico", chip: "Gestão · Contratos",
    headline: "O assistente jurídico: contratos, LGPD e termos — sem juridiquês.", bullets: ["Revisa riscos de um contrato", "Redige rascunhos prontos", "Orienta sobre LGPD"] },
  { id: "proj", icon: <FolderKanban size={20} className="text-cyan-600" />, tagCor: "bg-cyan-100 text-cyan-700", nome: "Projetos", chip: "Gestão · Execução",
    headline: "O gerente de projetos: plano, riscos e próximos passos.", bullets: ["Cronograma e responsáveis", "Mapeia riscos e bloqueios", "Organiza entregas"] },
  { id: "estr", icon: <Target size={20} className="text-violet-600" />, tagCor: "bg-violet-100 text-violet-700", nome: "Estratégia", chip: "Gestão · Decisão",
    headline: "O co-CEO: OKRs, prioridades e decisões difíceis.", bullets: ["Define metas do trimestre", "Compara cenários", "Prioriza por impacto"] },
] as const;

function SeletorAgentes() {
  const [sel, setSel] = useState<(typeof SEL_AGENTES)[number]["id"]>("sdr");
  const atual = SEL_AGENTES.find((a) => a.id === sel) ?? SEL_AGENTES[0];
  return (
    <section className="border-y border-black/5 bg-paper px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Monte a sua equipe</span>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Qual ajuda a sua empresa precisa hoje?</h2>
          <p className="mx-auto mt-2 max-w-xl text-black/50">Escolha o agente que resolve a sua dor agora — ou junte todos numa equipe só.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SEL_AGENTES.map((a) => {
            const on = a.id === sel;
            return (
              <button key={a.id} type="button" onClick={() => setSel(a.id)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${on ? "border-brand bg-white shadow-lg shadow-brand/10 ring-1 ring-brand/30" : "border-black/10 bg-white/60 hover:border-brand/30 hover:bg-white"}`}>
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-black/8 bg-paper">{a.icon}</span>
                <span className="text-sm font-bold">{a.nome}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.tagCor}`}>{a.chip}</span>
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
            <Link href="/login" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-brand/40">Quero esse agente <ArrowRight size={16} /></Link>
            <a href="#agentes" className="flex items-center justify-center gap-1.5 rounded-xl border border-black/15 px-7 py-3 text-sm font-medium text-black/70 transition hover:border-black/30">Ver todos os agentes <ChevronRight size={14} /></a>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMedia() {
  const [videoPronto, setVideoPronto] = useState(false);
  return (
    <div className="lp-anim lp-up [animation-delay:.2s]">
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video className={`${videoPronto ? "block" : "hidden"} w-full rounded-xl`} src="/demo.mp4" autoPlay muted loop playsInline preload="metadata" onCanPlay={() => setVideoPronto(true)} />
        {!videoPronto && <OpsMockup />}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/30">
        {videoPronto ? "Demonstração real do produto — os agentes trabalhando." : "Representação do painel — é isto que os seus agentes fazem enquanto você toca o negócio."}
      </p>
    </div>
  );
}

function OpsMockup() {
  return (
    <div className="rounded-xl bg-[#0e0e26]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <span className="relative flex h-2 w-2"><span className="lp-anim lp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
          Centro de operações — agora
        </span>
        <span className="text-[10px] text-white/35">teamagents</span>
      </div>
      <div className="space-y-2.5 p-4">
        <OpsRow delay=".5s" icon={<MessageCircle size={14} className="text-emerald-300" />} nome="Agente SDR" acao="atendendo um lead · agendou reunião" badge="qualificado" badgeCor="bg-emerald-400/15 text-emerald-300" />
        <OpsRow delay="1.1s" icon={<Wallet size={14} className="text-emerald-300" />} nome="Agente Financeiro" acao="analisando planilha de custos" badge="plano de corte" badgeCor="bg-violet-400/15 text-violet-300" />
        <OpsRow delay="1.7s" icon={<Scale size={14} className="text-indigo-300" />} nome="Agente Jurídico" acao="revisando contrato de fornecedor" badge="3 riscos achados" badgeCor="bg-sky-400/15 text-sky-300" />
        <OpsRow delay="2.3s" icon={<FolderKanban size={14} className="text-amber-300" />} nome="Projeto: Redução de Custo" acao="relatório consolidado pronto" badge="PDF gerado" badgeCor="bg-amber-400/15 text-amber-300" />
      </div>
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-[10px] text-white/35">
        <span className="flex items-center gap-1.5"><Cpu size={11} />Orquestrador + especialistas</span>
        <span className="flex items-center gap-1.5"><Shield size={11} />Dados isolados por empresa</span>
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
