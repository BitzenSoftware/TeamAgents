"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Cpu,
  Globe,
  Layers,
  Mail,
  MessageCircle,
  Megaphone,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

/* ============================== Dados ============================== */

const STATS = [
  { valor: "24/7", rotulo: "atendendo no WhatsApp" },
  { valor: "< 1 min", rotulo: "para responder cada cliente" },
  { valor: "0", rotulo: "DMs sem resposta de madrugada" },
  { valor: "4", rotulo: "agentes pela sua clínica" },
];

const MARQUEE = [
  "Cada cliente respondida em segundos",
  "Avaliações agendadas sozinhas",
  "“Quanto custa?” respondido com jeito",
  "Anúncios de procedimentos prontos",
  "Clientes atendidas às 2h da manhã",
  "Relatório de quanto você faturou",
  "Atende na linguagem da sua clínica",
  "Powered by Claude (Anthropic)",
];

const PASSOS = [
  {
    n: "1",
    titulo: "Conecte o WhatsApp da clínica",
    desc: "1 clique e um QR Code — sem instalar nada. Instagram, Facebook e Gmail também entram em poucos cliques.",
  },
  {
    n: "2",
    titulo: "Ensine sua clínica aos agentes",
    desc: "Cadastre Habilidades — seus procedimentos, valores, objeções comuns, tom de voz — e cada agente passa a falar como a sua clínica.",
  },
  {
    n: "3",
    titulo: "Deixe a recepção de IA trabalhar",
    desc: "Cada cliente atendida e qualificada, avaliações agendadas e o relatório do que rendeu — enquanto você cuida das pacientes.",
  },
];

const INTEGRACOES = [
  { nome: "WhatsApp", desc: "SDR + relatórios" },
  { nome: "Gmail", desc: "Agente Executivo" },
  { nome: "Facebook", desc: "publicação direta" },
  { nome: "Instagram", desc: "publicação direta" },
  { nome: "Discord", desc: "publicação direta" },
  { nome: "Cal.com", desc: "agenda automática" },
  { nome: "Stripe", desc: "assinatura segura" },
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
    para: "Para a clínica parar de perder cliente",
    extras: ["≈ 500 atendimentos no WhatsApp", "≈ 80 anúncios de procedimentos", "Upgrade quando a agenda lotar"],
  },
  Pro: {
    para: "Para clínica com agenda movimentada",
    extras: ["≈ 2.000 atendimentos no WhatsApp", "≈ 330 anúncios de procedimentos", "Melhor custo por atendimento"],
  },
  Scale: {
    para: "Para redes e várias unidades",
    extras: ["≈ 8.000 atendimentos no WhatsApp", "Volume para múltiplas unidades", "O menor custo por atendimento"],
  },
};

// Fallback se a API estiver fria/indisponível — substituído pelos valores da BD.
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
    q: "O TeamAgents traz clientes novas pra mim?",
    a: "Ele não inventa demanda do nada — nenhuma ferramenta faz isso de forma honesta. O que ele faz é capturar e converter a procura que você já gera (anúncios, posts, indicações): quem te chama no WhatsApp é atendido na hora, qualificado e agendado, e você ainda descobre de qual anúncio veio cada cliente. Pense nele como a recepcionista que nunca dorme, não como tráfego pago.",
  },
  {
    q: "Como funciona a conexão ao WhatsApp?",
    a: "Em 1 clique: você aperta “Ligar WhatsApp”, lê um QR Code com o celular da clínica e pronto — o agente começa a atender as clientes na hora, em conversa natural. Sem instalar nada, sem número novo.",
  },
  {
    q: "Os agentes falam a língua da minha clínica?",
    a: "Sim — conversam em português naturalmente e se adaptam com as Habilidades que você cadastrar: seus procedimentos, valores, objeções (“tá caro”, “dói?”, “quanto tempo dura?”) e o tom de voz da clínica. Cada clínica configura o seu.",
  },
  {
    q: "O que é um crédito?",
    a: "É a unidade de trabalho dos agentes. Um atendimento do SDR no WhatsApp custa 1 crédito; um anúncio completo de procedimento ≈ 6; um relatório do Diretor de BI ≈ 12; uma síntese de emails ≈ 10. A cobrança acompanha o custo real de IA de cada operação — você paga pelo que os agentes realmente fazem.",
  },
  {
    q: "Os créditos do plano acabaram. E agora?",
    a: "Você compra um pacote avulso dentro da app — pagamento único via Stripe. Os créditos avulsos somam ao seu saldo, nunca expiram e só são usados depois de esgotar a mensalidade do plano.",
  },
  {
    q: "Todos os planos têm os 4 agentes?",
    a: "Sim. Todos os planos incluem os 4 agentes, todas as integrações, as Habilidades e os relatórios. A única diferença entre planos é a quantidade de créditos mensais.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, com um clique dentro da própria app — sem emails, sem retenção forçada. Você mantém o acesso até o fim do período já pago e pode reativar quando quiser.",
  },
];

/* ============================== Página ============================== */

export default function LandingPage() {
  // Preços vêm da BD (endpoint público); fallback hardcoded enquanto carrega/se falhar.
  const [planos, setPlanos] = useState<PlanoLanding[]>(PLANOS_FALLBACK);
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
              extras: copy?.extras ?? [`≈ ${creditos} atendimentos no WhatsApp`],
            };
          }),
        );
      })
      .catch(() => {}); // mantém o fallback
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ====================== NAV ====================== */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a1f]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark">
              <Bot size={17} />
            </span>
            <span className="font-semibold tracking-tight">TeamAgents</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a href="#agentes" className="transition hover:text-white">Agentes</a>
            <a href="#tecnologia" className="transition hover:text-white">Tecnologia</a>
            <a href="#como-funciona" className="transition hover:text-white">Como funciona</a>
            <a href="#precos" className="transition hover:text-white">Preços</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
            <Link href="/blog" className="transition hover:text-white">Blog</Link>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0a0a1f] transition hover:bg-white/90"
          >
            Entrar
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ====================== HERO (dark) ====================== */}
      <header className="relative overflow-hidden bg-[#0a0a1f] text-white">
        {/* fundo: blobs + grelha */}
        <div className="pointer-events-none absolute inset-0">
          <div className="lp-anim lp-blob absolute -top-32 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand/30 blur-[120px]" />
          <div className="lp-anim lp-blob2 absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/20 blur-[110px]" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.6)_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-24">
          {/* coluna esquerda — proposta de valor */}
          <div>
            <div className="lp-anim lp-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70">
              <Sparkles size={13} className="text-amber-300" />
              Chatbot de IA para clínicas de estética
            </div>

            <h1 className="lp-anim lp-up mb-6 text-4xl font-bold leading-[1.08] tracking-tight [animation-delay:.08s] md:text-6xl">
              A cliente te chamou às 22h.
              <br />
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                Quem respondeu foi a sua IA.
              </span>
            </h1>

            <p className="lp-anim lp-up mb-9 max-w-xl text-lg leading-relaxed text-white/60 [animation-delay:.16s]">
              O TeamAgents atende cada mensagem no WhatsApp da sua clínica em segundos, entende o procedimento,
              responde o <strong className="text-white/85">“quanto custa?”</strong> sem assustar e <strong className="text-white/85">agenda a avaliação direto na sua agenda</strong> —
              24 horas por dia, enquanto você cuida das suas pacientes.
            </p>

            <div className="lp-anim lp-up flex flex-col gap-3 [animation-delay:.24s] sm:flex-row">
              <Link
                href="/login"
                className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-7 py-3.5 text-sm font-semibold shadow-lg shadow-brand/30 transition hover:shadow-brand/50"
              >
                Ativar minha recepção 24/7
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#agentes"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-7 py-3.5 text-sm font-medium text-white/75 transition hover:border-white/35 hover:text-white"
              >
                Conhecer a equipe
                <ChevronRight size={14} />
              </a>
            </div>

            {/* stats */}
            <div className="lp-anim lp-up mt-12 grid grid-cols-2 gap-x-8 gap-y-6 [animation-delay:.32s] sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.rotulo}>
                  <div className="text-2xl font-bold">{s.valor}</div>
                  <div className="mt-0.5 text-xs leading-snug text-white/45">{s.rotulo}</div>
                </div>
              ))}
            </div>
          </div>

          {/* coluna direita — vídeo real do produto (public/demo.mp4) ou mockup animado */}
          <HeroMedia />
        </div>

        {/* marquee */}
        <div className="relative border-t border-white/8 bg-white/[0.03] py-3.5">
          <div className="lp-marquee-mask overflow-hidden">
            <div className="lp-anim lp-marquee flex w-max gap-10 whitespace-nowrap text-xs font-medium text-white/40">
              {[...MARQUEE, ...MARQUEE].map((m, i) => (
                <span key={i} className="flex items-center gap-2">
                  <Zap size={11} className="text-brand" />
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ====================== AGENTES ====================== */}
      <section id="agentes" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              A equipe da sua clínica
            </span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Quatro especialistas. Uma agenda cheia.
            </h2>
            <p className="mx-auto max-w-2xl text-black/50">
              Do anúncio ao agendamento, da recepção ao relatório — uma automação de WhatsApp completa.
              Cada agente domina a sua função e trabalha junto com os outros pra lotar a sua agenda. Veja o que cada um faz pela clínica:
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* -------- Agente SDR -------- */}
            <AgentCard
              icon={<MessageCircle size={20} className="text-emerald-600" />}
              tag="WhatsApp · Recepção"
              tagCor="bg-emerald-100 text-emerald-700"
              nome="Agente SDR"
              desc="Um chatbot que atende cada cliente em segundos, entende qual procedimento ela quer, responde o “quanto custa?” sem assustar e faz o agendamento automático na sua agenda — ou passa pra você quando faz sentido."
              checks={["Atendimento automático 24/7", "Agendamento direto na sua agenda", "Histórico completo por cliente"]}
            >
              <div className="space-y-2 text-xs">
                <ChatBubble lado="lead" delay=".2s">Vi o anúncio do preenchimento labial. Quanto fica?</ChatBubble>
                <ChatBubble lado="agente" delay=".7s">Oi, Mariana! 💉 Te explico tudo. Você já fez harmonização antes ou seria a primeira vez?</ChatBubble>
                <ChatBubble lado="lead" delay="1.2s">Primeira vez</ChatBubble>
                <ChatBubble lado="agente" delay="1.7s">Que delícia começar! Tenho avaliação quinta às 10h com a Dra. — confirmo pra você?</ChatBubble>
                <div className="lp-anim lp-up flex items-center gap-1.5 pt-1 text-[11px] font-semibold text-emerald-700 [animation-delay:2.2s]">
                  <CheckCircle size={13} />
                  Avaliação agendada · cliente qualificada
                </div>
              </div>
            </AgentCard>

            {/* -------- Agente de Copywriting -------- */}
            <AgentCard
              icon={<Megaphone size={20} className="text-violet-600" />}
              tag="Anúncios · Meta & Google"
              tagCor="bg-violet-100 text-violet-700"
              nome="Agente de Copywriting"
              desc="Você dá o procedimento e o público; ele devolve duas variações de anúncio de alta conversão — pra Instagram e Meta — com gatilho, dor e desejo mapeados e a palavra-chave que liga o anúncio direto ao WhatsApp da clínica."
              checks={["2 variações prontas para publicar", "Publica no Instagram e Facebook", "Usa as Habilidades da sua clínica"]}
            >
              <div className="rounded-lg border border-violet-200 bg-white p-3.5">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-500">Anúncio A — Dor</div>
                <p className="text-sm font-semibold leading-snug">
                  “Cansada de esconder o sorriso por causa do bigode chinês?”
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-black/55">
                  O preenchimento certo devolve o contorno do seu rosto em 1 sessão. Avaliação gratuita
                  essa semana — chame no WhatsApp. 👇
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-medium">
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">gatilho: autoestima</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">dor: insegurança</span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-black/60">palavra-chave: PREENCHIMENTO</span>
                </div>
              </div>
            </AgentCard>

            {/* -------- Agente Executivo -------- */}
            <AgentCard
              icon={<Mail size={20} className="text-sky-600" />}
              tag="Email & Bastidores · Novo"
              tagCor="bg-sky-100 text-sky-700"
              nome="Agente Executivo"
              desc="Conecte o Gmail e ele resume o que importa nos bastidores da clínica — confirmações de fornecedor de toxina e preenchedor, boletos, convênios — em prioridades, ações e decisões. Sem você abrir a caixa de entrada."
              checks={["Tarefas com frequência, hora e fuso", "Resume só o que você mandar", "Prioridades, ações e decisões"]}
            >
              <div className="rounded-lg border border-sky-200 bg-white p-3.5 text-xs">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-black/70">5 emails → 1 síntese executiva</span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">tarefa: Fornecedores</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">alta</span>
                    <span className="text-black/70">Toxina chega sexta — confirmar recebimento na recepção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">média</span>
                    <span className="text-black/70">Boleto do preenchedor: conferir valor antes de pagar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">baixa</span>
                    <span className="text-black/70">Newsletter de congresso — sem ação necessária</span>
                  </div>
                </div>
                <div className="mt-2.5 border-t border-black/5 pt-2 text-[10px] text-black/45">
                  3 ações extraídas · 1 decisão · processado às 07:00 no seu fuso
                </div>
              </div>
            </AgentCard>

            {/* -------- Diretor de BI -------- */}
            <AgentCard
              icon={<BarChart3 size={20} className="text-amber-600" />}
              tag="Relatórios · Estratégia"
              tagCor="bg-amber-100 text-amber-700"
              nome="Agente Diretor de BI"
              desc="Toda semana mostra quantas clientes entraram, quantas avaliações foram agendadas, quanto custou cada uma — e, o que mais importa, quantas clientes você teria perdido sem a IA. Direto no seu WhatsApp, sem abrir painel."
              checks={["Clientes capturadas fora do horário", "Custo por avaliação agendada", "Entregue no WhatsApp, toda segunda"]}
            >
              <div className="rounded-lg border border-amber-200 bg-white p-3.5">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-black/40">Conversão DM → avaliação</div>
                    <div className="flex items-center gap-1.5 text-xl font-bold">
                      18%
                      <span className="flex items-center text-[11px] font-semibold text-emerald-600">
                        <TrendingUp size={12} />
                        +4 pts
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-medium uppercase tracking-wide text-black/40">Custo / avaliação</div>
                    <div className="text-xl font-bold">R$ 42</div>
                  </div>
                </div>
                <div className="flex h-14 items-end gap-1.5">
                  {[35, 50, 42, 65, 58, 80, 92].map((h, i) => (
                    <div key={i} className="lp-anim lp-bar flex-1 rounded-t bg-gradient-to-t from-amber-400 to-amber-300" style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
                <div className="mt-2.5 border-t border-black/5 pt-2 text-[10px] text-black/45">
                  Relatório enviado no WhatsApp · segunda, 07h00
                </div>
              </div>
            </AgentCard>
          </div>
        </div>
      </section>

      {/* ====================== TECNOLOGIA (dark) ====================== */}
      <section id="tecnologia" className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
              Engenharia, não mágica
            </span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Por trás: uma arquitetura de orquestração
            </h2>
            <p className="mx-auto max-w-2xl text-white/50">
              Não é “um chatbot”. É um sistema multi-agente: um orquestrador planeia, workers executam
              em paralelo e um sintetizador consolida — com o modelo certo para cada tarefa.
            </p>
          </div>

          {/* pipeline */}
          <div className="mx-auto mb-14 flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <PipeNode icon={<Bot size={18} />} titulo="Orquestrador" sub="planeia e divide" cor="from-indigo-500 to-violet-600" />
            <PipeConnector />
            <PipeNode icon={<Layers size={18} />} titulo="Workers ×N" sub="executam em paralelo" cor="from-emerald-500 to-teal-600" pulso />
            <PipeConnector />
            <PipeNode icon={<Sparkles size={18} />} titulo="Sintetizador" sub="consolida o resultado" cor="from-amber-500 to-orange-600" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <TechCard
              icon={<Cpu size={18} className="text-indigo-300" />}
              titulo="O modelo certo por tarefa"
              desc="Claude Opus para raciocínio estratégico, Haiku para velocidade em paralelo. Inteligência máxima, custo mínimo."
            />
            <TechCard
              icon={<Calendar size={18} className="text-emerald-300" />}
              titulo="Agenda como um humano"
              desc="Tarefas diárias, semanais, quinzenais, mensais, trimestrais ou semestrais — no dia, hora e fuso horário que você escolher."
            />
            <TechCard
              icon={<Wallet size={18} className="text-amber-300" />}
              titulo="Custo auditado por token"
              desc="Cada operação registra os tokens e o custo real do modelo usado. Você vê exatamente onde cada crédito foi gasto."
            />
            <TechCard
              icon={<Shield size={18} className="text-sky-300" />}
              titulo="Isolamento por clínica"
              desc="Os dados das suas pacientes, tokens e conexões ficam isolados por clínica, com autenticação em todas as operações."
            />
          </div>
        </div>
      </section>

      {/* ====================== HABILIDADES ====================== */}
      <section className="border-b border-black/5 bg-white px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              Habilidades
            </span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Agentes que conhecem
              <br />a <span className="text-brand">sua</span> clínica.
            </h2>
            <p className="mb-6 leading-relaxed text-black/55">
              IA genérica dá respostas genéricas. No TeamAgents, você cadastra <strong>Habilidades</strong> —
              o tom de voz da clínica, os seus procedimentos e valores, as objeções comuns (“tá caro”, “dói?”),
              os seus protocolos — e atribui a cada agente apenas o conhecimento que ele precisa.
            </p>
            <ul className="space-y-3 text-sm">
              {[
                "O SDR responde com o seu tom e os valores certos de cada procedimento",
                "O Copywriting escreve como a sua clínica fala",
                "O Executivo extrai exatamente a informação que você pediu",
                "Você atualiza uma vez — todos os agentes acompanham",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand" />
                  <span className="text-black/70">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {[
              { titulo: "Tom de voz da clínica", agente: "Global", cor: "bg-black/5 text-black/60", linhas: "Acolhedor e seguro, sem prometer milagre. Tratamos a paciente por “você”…" },
              { titulo: "Procedimentos + objeções", agente: "Agente SDR", cor: "bg-emerald-100 text-emerald-700", linhas: "Preenchimento labial R$ 1.200. Se achar caro, explicar durabilidade e parcelamento…" },
              { titulo: "O que destacar nos emails de fornecedores", agente: "Agente Executivo", cor: "bg-sky-100 text-sky-700", linhas: "Entregas de toxina/preenchedor, validade dos lotes e boletos a vencer…" },
            ].map((h, i) => (
              <div key={h.titulo} className="lp-anim lp-up rounded-xl border border-black/10 bg-paper p-4 shadow-sm" style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{h.titulo}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${h.cor}`}>{h.agente}</span>
                </div>
                <p className="text-xs leading-relaxed text-black/45">{h.linhas}</p>
              </div>
            ))}
            <p className="pt-1 text-center text-[11px] text-black/35">
              Exemplos de Habilidades — cadastre as suas em minutos.
            </p>
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
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">
                  {p.n}
                </div>
                <h3 className="mb-2 font-semibold">{p.titulo}</h3>
                <p className="text-sm leading-relaxed text-black/55">{p.desc}</p>
                {i < PASSOS.length - 1 && (
                  <ChevronRight size={18} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-black/20 md:block" />
                )}
              </div>
            ))}
          </div>

          {/* integrações */}
          <div className="mt-14 rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-black/70">
              <Globe size={16} className="text-brand" />
              Liga-se ao que já usas
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {INTEGRACOES.map((i) => (
                <div key={i.nome} className="rounded-xl border border-black/8 bg-paper px-3 py-3 text-center transition hover:border-brand/30 hover:shadow-sm">
                  <div className="text-sm font-semibold">{i.nome}</div>
                  <div className="mt-0.5 text-[10px] text-black/40">{i.desc}</div>
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
            <span className="mb-3 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              Preços simples
            </span>
            <h2 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
              Menos do que meia diária de recepcionista.
              <br />O trabalho de uma equipe inteira.
            </h2>
            <p className="mx-auto max-w-2xl text-black/50">
              Todos os planos incluem os <strong>4 agentes</strong>, todas as integrações, Habilidades e
              relatórios. Só os créditos mensais mudam.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {planos.map((p) => (
              <div
                key={p.nome}
                className={`relative flex flex-col rounded-2xl border p-7 ${
                  p.destaque
                    ? "border-brand bg-gradient-to-b from-brand/[0.06] to-transparent shadow-xl shadow-brand/10"
                    : "border-black/10 bg-white"
                }`}
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand to-brand-dark px-3 py-1 text-[11px] font-bold text-white shadow">
                    MAIS POPULAR
                  </span>
                )}
                <div className="mb-1 text-sm font-semibold text-black/60">{p.nome}</div>
                <div className="mb-1 flex items-baseline gap-1">
                  <span className="text-sm font-medium text-black/40">R$</span>
                  <span className="text-5xl font-bold tracking-tight">{p.preco}</span>
                  <span className="text-sm text-black/40">/mês</span>
                </div>
                <div className="mb-5 text-xs text-black/45">{p.para}</div>

                <div className={`mb-5 rounded-xl px-4 py-3 text-center ${p.destaque ? "bg-brand/10" : "bg-paper"}`}>
                  <span className="text-lg font-bold">{p.creditos}</span>
                  <span className="text-sm text-black/55"> créditos/mês</span>
                </div>

                <ul className="mb-7 space-y-2.5 text-sm">
                  {["4 agentes incluídos", "Todas as integrações", "Habilidades ilimitadas", "Dashboards de consumo", ...p.extras].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={15} className={`mt-0.5 shrink-0 ${p.destaque ? "text-brand" : "text-black/30"}`} />
                      <span className="text-black/65">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-auto rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${
                    p.destaque
                      ? "bg-gradient-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/25 hover:shadow-brand/40"
                      : "border border-black/15 text-ink hover:bg-black/5"
                  }`}
                >
                  Começar com o {p.nome}
                </Link>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-2 rounded-2xl border border-dashed border-black/15 bg-paper px-6 py-5 text-center sm:flex-row sm:text-left">
            <Wallet size={20} className="shrink-0 text-brand" />
            <p className="text-sm text-black/60">
              <strong>Pico de trabalho?</strong> Compra pacotes avulsos de créditos dentro da app — pagamento
              único, <strong>nunca expiram</strong> e só são usados depois da mensalidade do plano.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-black/40">
            <Clock size={12} className="mr-1 inline" />
            Cancele quando quiser, com um clique, dentro da app. Sem fidelização.
          </p>
        </div>
      </section>

      {/* ====================== FAQ ====================== */}
      <section id="faq" className="px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight">Perguntas frequentes</h2>
            <p className="text-black/50">Tudo o que costumam perguntar antes de começar.</p>
          </div>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-black/10 bg-white open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronRight size={16} className="shrink-0 text-black/30 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-black/55">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ====================== CTA FINAL (dark) ====================== */}
      <section className="relative overflow-hidden bg-[#0a0a1f] px-6 py-24 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="lp-anim lp-blob absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25 blur-[110px]" />
        </div>
        <div className="relative mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
            A clínica vizinha já responde
            <br />em segundos. E a sua?
          </h2>
          <p className="mx-auto mb-9 max-w-lg text-white/55">
            Ative sua recepção de IA hoje: conecte o WhatsApp em 1 clique e veja a primeira avaliação
            ser agendada sozinha — enquanto você atende quem já está na cadeira.
          </p>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-dark px-9 py-4 text-sm font-semibold shadow-lg shadow-brand/30 transition hover:shadow-brand/50"
          >
            Ativar minha recepção 24/7
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-4 text-xs text-white/35">A partir de R$ 179/mês · cancele quando quiser</p>
        </div>
      </section>

      {/* ====================== FOOTER ====================== */}
      <footer className="border-t border-white/10 bg-[#0a0a1f] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-white">
              <Bot size={14} />
            </span>
            TeamAgents
          </div>
          <div className="flex items-center gap-6 text-xs text-white/40">
            <a href="#agentes" className="transition hover:text-white/70">Agentes</a>
            <a href="#precos" className="transition hover:text-white/70">Preços</a>
            <Link href="/blog" className="transition hover:text-white/70">Blog</Link>
            <Link href="/privacidade" className="transition hover:text-white/70">Privacidade</Link>
            <Link href="/login" className="transition hover:text-white/70">Entrar</Link>
          </div>
          <span className="text-xs text-white/30">
            © {new Date().getFullYear()} TeamAgents · Bitzen. Todos os direitos reservados.
          </span>
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

function HeroMedia() {
  // Vídeo real do produto: basta adicionar o arquivo frontend/public/demo.mp4
  // ao repo e ele substitui automaticamente o mockup animado (que fica como
  // fallback enquanto o vídeo não existe ou não carrega).
  const [videoPronto, setVideoPronto] = useState(false);
  return (
    <div className="lp-anim lp-up [animation-delay:.2s]">
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          className={`${videoPronto ? "block" : "hidden"} w-full rounded-xl`}
          src="/demo.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setVideoPronto(true)}
        />
        {!videoPronto && <OpsMockup />}
      </div>
      <p className="mt-3 text-center text-[11px] text-white/30">
        {videoPronto
          ? "Demonstração real do produto — os agentes trabalhando."
          : "Representação do painel em tempo real — é isto que os seus agentes fazem enquanto você dorme."}
      </p>
    </div>
  );
}

function OpsMockup() {
  return (
    <div className="rounded-xl bg-[#0e0e26]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-white/80">
          <span className="relative flex h-2 w-2">
            <span className="lp-anim lp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Centro de operações — agora
        </span>
        <span className="text-[10px] text-white/35">teamagents</span>
      </div>

      <div className="space-y-2.5 p-4">
        <OpsRow
          delay=".5s"
          icon={<MessageCircle size={14} className="text-emerald-300" />}
          nome="Agente SDR"
          acao="atendendo a Mariana · preenchimento labial"
          badge="avaliação agendada"
          badgeCor="bg-emerald-400/15 text-emerald-300"
        />
        <OpsRow
          delay="1.1s"
          icon={<Megaphone size={14} className="text-violet-300" />}
          nome="Agente de Copywriting"
          acao="gerando 2 anúncios · harmonização facial"
          badge="gatilho: autoestima"
          badgeCor="bg-violet-400/15 text-violet-300"
        />
        <OpsRow
          delay="1.7s"
          icon={<Mail size={14} className="text-sky-300" />}
          nome="Agente Executivo"
          acao="resumindo emails de fornecedores · 3 workers ativos"
          badge="2 ações extraídas"
          badgeCor="bg-sky-400/15 text-sky-300"
        />
        <OpsRow
          delay="2.3s"
          icon={<BarChart3 size={14} className="text-amber-300" />}
          nome="Diretor de BI"
          acao="fechando o relatório semanal · conversão 18%"
          badge="enviado no WhatsApp"
          badgeCor="bg-amber-400/15 text-amber-300"
        />
      </div>

      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-[10px] text-white/35">
        <span className="flex items-center gap-1.5">
          <Cpu size={11} />
          Orquestrador + workers em paralelo
        </span>
        <span className="flex items-center gap-1.5">
          <Shield size={11} />
          Dados isolados por clínica
        </span>
      </div>
    </div>
  );
}

function OpsRow({
  delay,
  icon,
  nome,
  acao,
  badge,
  badgeCor,
}: {
  delay: string;
  icon: React.ReactNode;
  nome: string;
  acao: string;
  badge: string;
  badgeCor: string;
}) {
  return (
    <div className="lp-anim lp-up rounded-lg border border-white/8 bg-white/[0.03] p-3" style={{ animationDelay: delay }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/8">{icon}</span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white/85">{nome}</div>
            <div className="truncate text-[11px] text-white/40">{acao}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeCor}`}>{badge}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
        <div className="lp-anim lp-shimmer h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent" />
      </div>
    </div>
  );
}

function AgentCard({
  icon,
  tag,
  tagCor,
  nome,
  desc,
  checks,
  children,
}: {
  icon: React.ReactNode;
  tag: string;
  tagCor: string;
  nome: string;
  desc: string;
  checks: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-brand/25 hover:shadow-xl hover:shadow-brand/5 lg:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-black/8 bg-paper shadow-sm">{icon}</span>
          <h3 className="text-lg font-bold tracking-tight">{nome}</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tagCor}`}>{tag}</span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-black/55">{desc}</p>

      {/* mockup do produto */}
      <div className="mb-5 rounded-xl border border-black/8 bg-paper p-3.5">{children}</div>

      <ul className="mt-auto space-y-2 text-xs">
        {checks.map((c) => (
          <li key={c} className="flex items-center gap-2 text-black/65">
            <CheckCircle size={13} className="shrink-0 text-brand" />
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChatBubble({ lado, delay, children }: { lado: "lead" | "agente"; delay: string; children: React.ReactNode }) {
  const isAgente = lado === "agente";
  return (
    <div className={`lp-anim lp-up flex ${isAgente ? "justify-end" : "justify-start"}`} style={{ animationDelay: delay }}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed ${
          isAgente ? "rounded-br-sm bg-emerald-600 text-white" : "rounded-bl-sm border border-black/8 bg-white text-black/75"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function PipeNode({
  icon,
  titulo,
  sub,
  cor,
  pulso,
}: {
  icon: React.ReactNode;
  titulo: string;
  sub: string;
  cor: string;
  pulso?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${cor} shadow-lg`}>
        {icon}
        {pulso && <span className="lp-anim lp-ping absolute inset-0 rounded-2xl bg-emerald-400/40" />}
      </span>
      <div>
        <div className="text-sm font-semibold">{titulo}</div>
        <div className="text-[11px] text-white/40">{sub}</div>
      </div>
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
  return (
    <div className="h-8 w-px bg-gradient-to-b from-white/5 via-white/25 to-white/5 sm:h-px sm:w-full sm:max-w-[70px] sm:bg-gradient-to-r" />
  );
}
