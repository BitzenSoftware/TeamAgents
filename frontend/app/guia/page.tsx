export default function GuiaPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 pb-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Guia do Utilizador</h1>
        <p className="mt-1 text-sm text-black/50">
          Como o TeamAgents trabalha por si — em linguagem simples.
        </p>
      </header>

      {/* A ideia grande */}
      <Section title="A ideia em uma frase">
        <p className="text-[15px] leading-relaxed">
          O TeamAgents é uma <strong>equipa comercial virtual</strong> que trabalha 24h por dia: cria
          os anúncios, atende e qualifica quem responde no WhatsApp, agenda as reuniões e ainda lhe
          entrega um relatório estratégico todas as semanas.
        </p>
      </Section>

      {/* A jornada */}
      <Section title="A jornada de um cliente">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            { n: "1", t: "Anúncio", d: "Atrai pessoas interessadas" },
            { n: "2", t: "WhatsApp", d: "A pessoa responde" },
            { n: "3", t: "Qualificação", d: "O vendedor conversa e agenda" },
            { n: "4", t: "Relatório", d: "Vê o resultado da semana" },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-semibold text-white">
                {s.n}
              </div>
              <div className="font-medium">{s.t}</div>
              <div className="text-xs text-black/50">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Os menus */}
      <Section title="Os menus do painel">
        <div className="space-y-3">
          <ModuleCard
            icon="📣"
            title="Campanhas"
            subtitle="A fábrica de anúncios"
            tag="O seu redator publicitário"
          >
            Escreve o <strong>nicho</strong> do cliente e a <strong>dor</strong> que ele tem. Em
            segundos, o sistema gera <strong>2 versões de anúncio</strong> para Meta/Google Ads — uma
            focada na dor, outra no benefício — e uma <strong>palavra-chave</strong> que liga esse
            anúncio às conversas futuras. As campanhas ficam guardadas no histórico.
          </ModuleCard>

          <ModuleCard
            icon="📊"
            title="Pipeline"
            subtitle="O funil de vendas"
            tag="O seu painel comercial em tempo real"
          >
            O quadro com todas as pessoas que responderam, organizadas por fase. Clique em qualquer
            uma para ler a conversa completa.
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill className="bg-slate-100 text-slate-700">Frio — acabou de chegar</Pill>
              <Pill className="bg-amber-100 text-amber-800">Em andamento — a qualificar</Pill>
              <Pill className="bg-emerald-100 text-emerald-800">Qualificado — reunião proposta</Pill>
              <Pill className="bg-rose-100 text-rose-700">Desqualificado — fora do perfil</Pill>
            </div>
          </ModuleCard>

          <ModuleCard
            icon="🧠"
            title="Consultoria"
            subtitle="O relatório do diretor"
            tag="O seu consultor de negócio"
          >
            Todas as semanas o sistema analisa os resultados e envia-lhe um relatório no WhatsApp (e
            mostra-o aqui): quantos leads entraram, quantos viraram reunião, o custo por reunião e uma{" "}
            <strong>análise estratégica</strong> do que está a funcionar e o que ajustar.
          </ModuleCard>

          <ModuleCard
            icon="⚙️"
            title="Configurações"
            subtitle="A ligação ao seu WhatsApp"
            tag="A tomada que liga tudo à corrente"
          >
            Ligue o sistema ao seu <strong>número de WhatsApp</strong>, ao seu <strong>link de
            agenda</strong> e defina onde quer receber o relatório. É o que faz tudo funcionar com o
            seu negócio real.
          </ModuleCard>
        </div>
      </Section>

      {/* Como se liga */}
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

      {/* Privacidade */}
      <Section title="Os seus dados são só seus">
        <p className="text-[15px] leading-relaxed">
          Cada empresa vê apenas os <strong>seus próprios</strong> leads, campanhas e relatórios —
          totalmente isolado das outras empresas que usam o sistema.
        </p>
      </Section>

      {/* Primeiros passos */}
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
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] text-white">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-black/40">{title}</h2>
      {children}
    </section>
  );
}

function ModuleCard({
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
    <div className="rounded-xl border border-black/10 bg-white p-5">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-black/40">— {subtitle}</span>
      </div>
      <div className="text-[15px] leading-relaxed text-black/80">{children}</div>
      <div className="mt-3 text-xs italic text-black/45">{tag}</div>
    </div>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`}>
      {children}
    </span>
  );
}
