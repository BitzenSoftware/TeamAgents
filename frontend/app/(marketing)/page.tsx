"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  BarChart3,
  MessageCircle,
  Megaphone,
  CheckCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  Zap,
} from "lucide-react";

const AGENTS = [
  {
    icon: Megaphone,
    number: "01",
    name: "Copywriting de Alta Conversão",
    tag: "Anúncios",
    desc: "Recebe o nicho e a dor do cliente e gera duas variações de anúncio prontas para Meta e Google Ads — com gatilhos psicológicos identificados e palavra-chave de entrada para o WhatsApp.",
    output: ["2 variações de anúncio", "Gatilho principal", "Dor e desejo alvo", "Palavra-chave de entrada"],
    color: "bg-violet-50 border-violet-200",
    iconColor: "text-violet-600",
    tagColor: "bg-violet-100 text-violet-700",
    numberColor: "text-violet-200",
  },
  {
    icon: MessageCircle,
    number: "02",
    name: "SDR Sénior",
    tag: "WhatsApp",
    desc: "Qualifica cada lead em conversa natural no WhatsApp. Faz as perguntas certas, identifica o nível de interesse e agenda a reunião com o consultor — ou transfere para humano quando necessário.",
    output: ["Qualificação automática", "Agendamento de reunião", "Transferência inteligente", "Histórico completo"],
    color: "bg-emerald-50 border-emerald-200",
    iconColor: "text-emerald-600",
    tagColor: "bg-emerald-100 text-emerald-700",
    numberColor: "text-emerald-200",
  },
  {
    icon: BarChart3,
    number: "03",
    name: "Diretor de BI",
    tag: "Relatórios",
    desc: "Agrega as métricas da semana — leads, reuniões, investimento, taxa de conversão e custo por agendamento — e entrega um relatório estratégico directamente no WhatsApp do dono do negócio.",
    output: ["Taxa de conversão", "Custo por agendamento", "Relatório no WhatsApp", "Tendências semanais"],
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-600",
    tagColor: "bg-amber-100 text-amber-700",
    numberColor: "text-amber-200",
  },
];

const STEPS = [
  { step: "1", title: "Cria a campanha", desc: "Define o nicho e a dor do teu cliente. O agente de Copywriting gera os anúncios em segundos." },
  { step: "2", title: "Liga o WhatsApp", desc: "Conecta a instância da Evolution API. O SDR começa a responder leads automaticamente." },
  { step: "3", title: "Recebe os relatórios", desc: "Toda semana, o Diretor de BI envia um resumo executivo directo para o teu WhatsApp." },
];

const BENEFITS = [
  { icon: Clock, text: "Responde leads 24h por dia, 7 dias por semana" },
  { icon: Zap, text: "Qualificação em menos de 2 minutos por lead" },
  { icon: TrendingUp, text: "Métricas de conversão em tempo real" },
  { icon: CheckCircle, text: "Reuniões agendadas sem intervenção humana" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-black/8 bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-ink" />
            <span className="font-semibold tracking-tight">TeamAgents</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Entrar na plataforma
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Tríade de agentes de IA para tráfego pago
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            A equipa de IA que qualifica
            <br />
            <span className="text-black/40">os teus leads no WhatsApp.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-black/55">
            Três agentes especializados trabalham em conjunto — geram os anúncios, qualificam os leads em conversa natural e entregam relatórios de desempenho — enquanto tu te focas no que importa.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Começar agora
              <ArrowRight size={16} />
            </Link>
            <a
              href="#como-funciona"
              className="flex items-center gap-1.5 rounded-xl border border-black/12 px-6 py-3 text-sm font-medium text-black/70 hover:border-black/25 transition-colors"
            >
              Ver como funciona
              <ChevronRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-y border-black/8 bg-white py-5">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.text} className="flex items-center gap-2.5">
                <b.icon size={16} className="shrink-0 text-black/40" />
                <span className="text-xs text-black/60">{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Três agentes. Um funil completo.
            </h2>
            <p className="text-black/50">
              Cada agente é especialista na sua fase — juntos fecham o ciclo do anúncio à reunião.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {AGENTS.map((a) => (
              <div
                key={a.name}
                className={`relative rounded-2xl border p-6 ${a.color}`}
              >
                <span className={`absolute right-6 top-4 text-5xl font-black leading-none ${a.numberColor}`}>
                  {a.number}
                </span>
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-xl bg-white p-2.5 shadow-sm">
                    <a.icon size={20} className={a.iconColor} />
                  </div>
                  <span className={`mt-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.tagColor}`}>
                    {a.tag}
                  </span>
                </div>
                <h3 className="mb-3 font-semibold leading-snug">{a.name}</h3>
                <p className="mb-5 text-sm leading-relaxed text-black/60">{a.desc}</p>
                <div className="space-y-2">
                  {a.output.map((o) => (
                    <div key={o} className="flex items-center gap-2 text-xs text-black/70">
                      <CheckCircle size={13} className="shrink-0 text-black/30" />
                      {o}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fluxo */}
      <section id="como-funciona" className="border-t border-black/8 bg-white px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">
              Como funciona
            </h2>
            <p className="text-black/50">
              Da criação da campanha ao relatório semanal — em três passos.
            </p>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-px bg-black/8 md:block" />
            <div className="space-y-8">
              {STEPS.map((s) => (
                <div key={s.step} className="flex gap-6">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-black/12 bg-white text-sm font-bold shadow-sm">
                    {s.step}
                  </div>
                  <div className="flex-1 pb-2 pt-2.5">
                    <h3 className="mb-1 font-semibold">{s.title}</h3>
                    <p className="text-sm leading-relaxed text-black/55">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Pronto para automatizar
            <br />a qualificação de leads?
          </h2>
          <p className="mb-8 text-black/55">
            Acede à plataforma, liga o teu WhatsApp e deixa os agentes trabalhar.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-8 py-3.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Entrar na plataforma
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/8 py-8 px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-black/40">
            <Bot size={14} />
            <span>TeamAgents</span>
          </div>
          <span className="text-xs text-black/30">
            © {new Date().getFullYear()} TeamAgents. Todos os direitos reservados.
          </span>
        </div>
      </footer>

    </div>
  );
}
