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
    <div className="max-w-5xl p-6 pb-16">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Guia do Usuário</h1>
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
          O TeamAgents é uma <strong>equipe comercial virtual</strong> que trabalha 24h por dia: cria
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
            { n: "4", t: "Relatório", d: "Veja o resultado da semana" },
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
              "Crie a campanha → o sistema gera uma palavra-chave (ex: DESBUROCRATIZAR)",
              "Coloque essa palavra no seu anúncio",
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
            Tudo <strong>automático</strong> — depois de criar a campanha, não precisa mexer um
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

      <Section title="Como ativar (passo a passo)">
        <ol className="space-y-3 text-sm">
          {[
            {
              t: "Ligue o WhatsApp da clínica",
              d: "Menu Configurações → aba WhatsApp → botão “Ligar WhatsApp”. Leia o QR Code com o celular da clínica. Pronto: o número aparece sozinho no campo logo abaixo.",
            },
            {
              t: "Ensine os procedimentos e preços ao agente",
              d: "Menu Habilidades → botão “✨ Modelos de estética” → “Adicionar todos” → edite cada um com os seus valores reais. É isto que faz o agente entender os procedimentos e responder “quanto custa” sem fugir.",
            },
            {
              t: "Defina como o agendamento acontece",
              d: "Simples: em Configurações → “Link de calendário”, cole o seu Calendly/Cal.com — o agente envia o link para a cliente marcar. Automático (recomendado): no card “📅 Agendamento automático (Cal.com)”, ligue a sua conta Cal.com (API key + Event Type ID) e o agente marca a avaliação sozinho nos horários livres da sua agenda.",
            },
            {
              t: "Crie a primeira campanha e pegue o link de captação",
              d: "Menu Agente de Copywriting → botão “+ Nova campanha” → gere. Clique na campanha à esquerda e, no detalhe, copie o “📲 Link de captação” (ou baixe o QR Code).",
            },
            {
              t: "Espalhe o link para as clientes chegarem",
              d: "Cole o link na bio do Instagram, no story, no botão do anúncio ou imprima o QR na recepção. Quem clicar já cai no seu WhatsApp — e o agente assume a conversa.",
            },
            {
              t: "Acompanhe no Pipeline e receba o relatório",
              d: "As conversas aparecem no menu Agente SDR (Pipeline) e o balanço semanal chega no menu Agente Diretor de BI (Consultoria).",
            },
          ].map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <span>
                <span className="font-semibold">{p.t}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-black/55">{p.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <Nota>
          Para testar agora: abra o link de captação <strong>em outro celular</strong>, mande a mensagem
          (ela já vem escrita) e veja a conversa surgir no Pipeline com o agente respondendo em segundos.
        </Nota>
      </Section>

      <Section title="O agente responde cada mensagem — é normal">
        <p className="text-[15px] leading-relaxed">
          O Agente SDR é uma <strong>conversa</strong>, não um robô de uma resposta só. A cada mensagem
          da cliente ele lê o histórico todo e responde — como uma recepcionista faria. Ele segue
          conversando até <strong>agendar a avaliação</strong> ou <strong>passar para um humano</strong>
          (ex.: dúvida clínica). Cada resposta usa 1 crédito.
        </p>
      </Section>
    </div>
  );
}

/* ---------------- Campanhas ---------------- */
function Campanhas() {
  return (
    <ModuleTab icon="📣" title="Campanhas" subtitle="A fábrica de anúncios" tag="O seu redator publicitário">
      <p>
        Escreva o <strong>nicho</strong> do seu cliente e a <strong>dor</strong> que ele tem. Em
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
      <p>
        Pode ainda <strong>publicar cada anúncio diretamente</strong> no Facebook, Instagram ou Discord
        — escolha as redes abaixo de cada versão e clique em <strong>Postar</strong> (basta ter as
        contas conectadas em Configurações).
      </p>
      <Nota>
        <strong>📲 O link de captação é o mais importante.</strong> No detalhe de cada campanha aparece
        um <strong>link e um QR Code</strong> que levam direto pro WhatsApp da clínica, já com a
        palavra-chave. Cole na bio, no story ou no botão do anúncio: quem clicar vira atendimento na
        hora — e cai automaticamente nesta campanha. É a ponte entre o anúncio e a conversa.
      </Nota>
      <Nota>
        Pode escolher quais <strong>Habilidades</strong> (conhecimento da empresa) entram na geração —
        usa menos tokens e foca o anúncio. Todas as campanhas ficam salvas e podem ser editadas ou
        apagadas.
      </Nota>
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
        <Fase cor="bg-amber-100 text-amber-800" nome="Em andamento" desc="o vendedor está conversando e qualificando" />
        <Fase cor="bg-emerald-100 text-emerald-800" nome="Qualificado" desc="tem perfil, reunião proposta/agendada" />
        <Fase cor="bg-rose-100 text-rose-700" nome="Desqualificado" desc="não tem perfil para a sua oferta" />
      </div>
      <Nota>Os leads se movem entre as colunas sozinhos, à medida que o vendedor avança a conversa.</Nota>
    </ModuleTab>
  );
}

/* ---------------- Consultoria ---------------- */
function Consultoria() {
  return (
    <ModuleTab icon="🧠" title="Consultoria" subtitle="O relatório do diretor" tag="O seu consultor de negócio">
      <p>
        Todas as semanas o sistema analisa os resultados e <strong>envia um relatório para você no
        WhatsApp</strong> (e mostra aqui no painel). Cada relatório traz:
      </p>
      <Lista
        itens={[
          "Quantos leads entraram na semana",
          "Quantos foram engajados e quantos viraram reunião",
          "Quanto custou cada reunião agendada",
          "Uma análise estratégica: o que está funcionando e o que ajustar na próxima semana",
        ]}
      />
      <Nota>Você acorda na segunda-feira com a consultoria pronta — sem mexer um dedo.</Nota>
    </ModuleTab>
  );
}

/* ---------------- Configurações ---------------- */
function Configuracoes() {
  return (
    <ModuleTab icon="⚙️" title="Configurações" subtitle="Onde liga tudo ao seu negócio" tag="A tomada que liga tudo à corrente">
      <p>É aqui que você conecta o sistema ao seu negócio real, organizado em abas:</p>

      <p className="font-semibold text-black/90">📱 WhatsApp — Evolution API / Agenda</p>
      <Lista
        itens={[
          "O número de WhatsApp da empresa (via Evolution API) — por onde o vendedor atende",
          "O link de agenda (Calendly / Cal.com) — que o vendedor envia para marcar reunião",
          "Agendamento automático (Cal.com): ligue a sua conta e o agente marca a avaliação sozinho na agenda — sem você mexer",
          "O número do dono — onde recebe o relatório semanal",
        ]}
      />

      <p className="font-semibold text-black/90">🔵 Facebook & Instagram — publicação automática</p>
      <Lista
        itens={[
          'Clique em "Ligar com Facebook" e autorize — os tokens são salvos automaticamente, sem configuração manual',
          "Conecte a Página do Facebook e a conta Instagram Business associada em um só passo",
          "Depois, publica os anúncios da Fábrica de Campanhas diretamente no Facebook e Instagram",
          "Existe também configuração manual (Page ID + Token) e botões de teste, para casos avançados",
        ]}
      />
      <Nota>O Instagram exige sempre uma imagem na publicação; o Facebook aceita só texto.</Nota>

      <p className="font-semibold text-black/90">📧 Email (Gmail) — Agente Executivo</p>
      <Lista
        itens={[
          'Clique em "Ligar Gmail" e autorize — acesso só de leitura, os tokens ficam salvos de forma segura',
          "No menu Agente Executivo você cria tarefas (ex.: ler emails de um remetente) e ele resume — prioridades, ações e decisões",
          "Cada empresa conecta a sua própria caixa; os dados ficam isolados por empresa",
        ]}
      />
      <Nota>
        O agente lê só o que as suas tarefas pedem (não a caixa inteira) — economiza tokens. Você pode
        ainda marcar uma tarefa como “diária” para rodar sozinha todos os dias.
      </Nota>

      <p className="font-semibold text-black/90">💬 Discord — notificações e relatórios</p>
      <Lista
        itens={[
          "Cole o Webhook URL de um canal do seu servidor Discord",
          "Use o botão de teste para confirmar a conexão",
          "As notificações e relatórios do Diretor de BI passam a chegar também ao seu Discord",
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
