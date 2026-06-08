"use client";

import { useState } from "react";

const TABS = [
  { id: "geral", label: "Visão Geral" },
  { id: "campanhas", label: "📣 Campanhas" },
  { id: "pipeline", label: "📊 Pipeline" },
  { id: "consultoria", label: "🧠 Consultoria" },
  { id: "configuracoes", label: "⚙️ Configurações" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function GuiaPage() {
  const [tab, setTab] = useState<TabId>("geral");

  return (
    <div className="mx-auto max-w-3xl p-6 pb-16">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Guia do Utilizador</h1>
        <p className="mt-1 text-sm text-black/50">
          Como o TeamAgents trabalha por si — em linguagem simples.
        </p>
      </header>

      {/* Abas */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-black/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              tab === t.id ? "bg-brand text-white" : "text-black/60 hover:bg-black/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "geral" && <Geral />}
      {tab === "campanhas" && <Campanhas />}
      {tab === "pipeline" && <Pipeline />}
      {tab === "consultoria" && <Consultoria />}
      {tab === "configuracoes" && <Configuracoes />}
    </div>
  );
}

/* ---------------- Visão Geral ---------------- */
function Geral() {
  return (
    <div className="space-y-8">
      <Section title="A ideia em uma frase">
        <p className="text-[15px] leading-relaxed">
          O TeamAgents é uma <strong>equipa comercial virtual</strong> que trabalha 24h por dia: cria
          os anúncios, atende e qualifica quem responde no WhatsApp, agenda as reuniões e ainda lhe
          entrega um relatório estratégico todas as semanas.
        </p>
      </Section>

      <Section title="A jornada de um cliente">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            { n: "1", t: "Anúncio", d: "Atrai pessoas interessadas" },
            { n: "2", t: "WhatsApp", d: "A pessoa responde" },
            { n: "3", t: "Qualificação", d: "O vendedor conversa e agenda" },
            { n: "4", t: "Relatório", d: "Vê o resultado da semana" },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-semibold text-white">
                {s.n}
              </div>
              <div className="font-medium">{s.t}</div>
              <div className="text-xs text-black/50">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Como tudo se liga — o segredo">
        <div className="rounded-xl border border-black/10 bg-paper p-5">
          <p className="mb-3 text-[15px] leading-relaxed">
            A <strong>palavra-chave</strong> é a cola que une tudo:
          </p>
          <ol className="space-y-2 text-sm">
            {[
              "Cria a campanha → o sistema gera uma palavra-chave (ex: DESBUROCRATIZAR)",
              "Põe essa palavra no seu anúncio",
              'Quem responder "vi sobre DESBUROCRATIZAR" é ligado automaticamente à campanha',
              "O vendedor já sabe a dor da pessoa e conversa à medida",
              "Você acompanha no Pipeline e o resultado entra no relatório semanal",
            ].map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-black/30">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-white p-3 text-sm text-black/70">
            Tudo <strong>automático</strong> — depois de criar a campanha, não precisa de mexer um
            dedo.
          </p>
        </div>
      </Section>

      <Section title="Os seus dados são só seus">
        <p className="text-[15px] leading-relaxed">
          Cada empresa vê apenas os <strong>seus próprios</strong> leads, campanhas e relatórios —
          totalmente isolado das outras empresas que usam o sistema.
        </p>
      </Section>

      <Section title="Primeiros passos">
        <ol className="space-y-2 text-sm">
          {[
            "Em Configurações, ligue o seu WhatsApp e o link de agenda",
            "Em Campanhas, gere o seu primeiro anúncio e copie a palavra-chave",
            "Publique o anúncio no Meta/Google Ads com essa palavra-chave",
            "Acompanhe os leads a entrar no Pipeline",
            "Receba o seu primeiro relatório na Consultoria",
          ].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] text-white">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

/* ---------------- Campanhas ---------------- */
function Campanhas() {
  return (
    <ModuleTab icon="📣" title="Campanhas" subtitle="A fábrica de anúncios" tag="O seu redator publicitário">
      <p>
        Escreve o <strong>nicho</strong> do seu cliente e a <strong>dor</strong> que ele tem. Em
        segundos, o sistema gera <strong>2 versões de anúncio</strong> prontas para o Meta/Google Ads.
      </p>
      <Lista
        itens={[
          "Versão focada na dor — toca no problema que tira o sono do cliente",
          "Versão focada no benefício — mostra o resultado desejado",
          "Uma palavra-chave única (ex: DESBUROCRATIZAR) que liga este anúncio às conversas futuras",
          "A estratégia por trás: gatilho, dor-alvo e desejo-alvo identificados pela IA",
        ]}
      />
      <Nota>Todas as campanhas geradas ficam guardadas no histórico, sempre acessíveis.</Nota>
    </ModuleTab>
  );
}

/* ---------------- Pipeline ---------------- */
function Pipeline() {
  return (
    <ModuleTab icon="📊" title="Pipeline" subtitle="O funil de vendas" tag="O seu painel comercial em tempo real">
      <p>
        O quadro com <strong>todas as pessoas que responderam</strong>, organizadas por fase. Clique
        em qualquer uma para ler a <strong>conversa completa</strong> que o vendedor teve com ela.
      </p>
      <div className="mt-4 space-y-2">
        <Fase cor="bg-slate-100 text-slate-700" nome="Frio" desc="acabou de chegar, ainda não interagiu" />
        <Fase cor="bg-amber-100 text-amber-800" nome="Em andamento" desc="o vendedor está a conversar e a qualificar" />
        <Fase cor="bg-emerald-100 text-emerald-800" nome="Qualificado" desc="tem perfil, reunião proposta/agendada" />
        <Fase cor="bg-rose-100 text-rose-700" nome="Desqualificado" desc="não tem perfil para a sua oferta" />
      </div>
      <Nota>Os leads movem-se entre as colunas sozinhos, à medida que o vendedor avança a conversa.</Nota>
    </ModuleTab>
  );
}

/* ---------------- Consultoria ---------------- */
function Consultoria() {
  return (
    <ModuleTab icon="🧠" title="Consultoria" subtitle="O relatório do diretor" tag="O seu consultor de negócio">
      <p>
        Todas as semanas o sistema analisa os resultados e <strong>envia-lhe um relatório no
        WhatsApp</strong> (e mostra-o aqui no painel). Cada relatório traz:
      </p>
      <Lista
        itens={[
          "Quantos leads entraram na semana",
          "Quantos foram engajados e quantos viraram reunião",
          "Quanto custou cada reunião agendada",
          "Uma análise estratégica: o que está a funcionar e o que ajustar na próxima semana",
        ]}
      />
      <Nota>Você acorda na segunda-feira com a consultoria pronta — sem mexer um dedo.</Nota>
    </ModuleTab>
  );
}

/* ---------------- Configurações ---------------- */
function Configuracoes() {
  return (
    <ModuleTab icon="⚙️" title="Configurações" subtitle="A ligação ao seu WhatsApp" tag="A tomada que liga tudo à corrente">
      <p>É aqui que liga o sistema ao seu negócio real. Precisa de configurar:</p>
      <Lista
        itens={[
          "O número de WhatsApp da empresa (via Evolution API) — por onde o vendedor atende",
          "O link de agenda (Calendly) — que o vendedor envia para marcar reunião",
          "O número do dono — onde recebe o relatório semanal",
        ]}
      />
      <Nota>
        Pode preencher isto a qualquer momento. Enquanto não ligar o WhatsApp, o sistema funciona em
        modo de demonstração.
      </Nota>
    </ModuleTab>
  );
}

/* ---------------- Componentes auxiliares ---------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/40">{title}</h2>
      {children}
    </section>
  );
}

function ModuleTab({
  icon,
  title,
  subtitle,
  tag,
  children,
}: {
  icon: string;
  title: string;
  subtitle: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <div className="mb-4 flex items-baseline gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-sm text-black/40">— {subtitle}</span>
      </div>
      <div className="space-y-3 text-[15px] leading-relaxed text-black/80">{children}</div>
      <div className="mt-5 border-t border-black/5 pt-3 text-xs italic text-black/45">{tag}</div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-1.5">
      {itens.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-emerald-600">✓</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Fase({ cor, nome, desc }: { cor: string; nome: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cor}`}>{nome}</span>
      <span className="text-sm text-black/60">{desc}</span>
    </div>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-paper p-3 text-sm text-black/70">{children}</p>;
}
