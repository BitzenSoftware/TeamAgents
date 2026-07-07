"use client";

import { useState } from "react";
import { useT } from "@/components/i18n-context";
import type { AppDict } from "@/lib/i18n/app";

type GuiaDict = AppDict["guia"];
type TabId = "geral" | "campanhas" | "pipeline" | "consultoria" | "configuracoes";
const TAB_IDS: TabId[] = ["geral", "campanhas", "pipeline", "consultoria", "configuracoes"];

// Renderiza **negrito** inline sem markdown pesado.
function Rich({ children }: { children: string }) {
  const parts = children.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function GuiaPage() {
  const t = useT().guia;
  const [tab, setTab] = useState<TabId>("geral");

  return (
    <div className="max-w-5xl p-6 pb-16">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t.titulo}</h1>
        <p className="mt-1 text-sm text-black/50">{t.subtitulo}</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-black/10 pb-3">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition ${
              tab === id ? "bg-brand text-white" : "text-black/60 hover:bg-black/5"
            }`}
          >
            {t.tabs[id]}
          </button>
        ))}
      </div>

      {tab === "geral" && <Geral t={t} />}
      {tab === "campanhas" && <Campanhas t={t} />}
      {tab === "pipeline" && <Pipeline t={t} />}
      {tab === "consultoria" && <Consultoria t={t} />}
      {tab === "configuracoes" && <Configuracoes t={t} />}
    </div>
  );
}

function Geral({ t }: { t: GuiaDict }) {
  const g = t.geral;
  return (
    <div className="space-y-8">
      <Section title={g.ideiaTitle}>
        <p className="text-[15px] leading-relaxed"><Rich>{g.ideia}</Rich></p>
      </Section>

      <Section title={g.jornadaTitle}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {g.jornada.map((s, i) => (
            <div key={i} className="rounded-xl border border-black/10 bg-white p-4">
              <div className="mb-2 grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{i + 1}</div>
              <div className="font-medium">{s.t}</div>
              <div className="text-xs text-black/50">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title={g.segredoTitle}>
        <div className="rounded-xl border border-black/10 bg-paper p-5">
          <p className="mb-3 text-[15px] leading-relaxed"><Rich>{g.segredoIntro}</Rich></p>
          <ol className="space-y-2 text-sm">
            {g.segredoPassos.map((p, i) => (
              <li key={i} className="flex gap-2"><span className="text-black/30">{i + 1}.</span><span>{p}</span></li>
            ))}
          </ol>
          <p className="mt-4 rounded-lg bg-white p-3 text-sm text-black/70"><Rich>{g.segredoNota}</Rich></p>
        </div>
      </Section>

      <Section title={g.dadosTitle}>
        <p className="text-[15px] leading-relaxed"><Rich>{g.dados}</Rich></p>
      </Section>

      <Section title={g.ativarTitle}>
        <ol className="space-y-3 text-sm">
          {g.ativarPassos.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">{i + 1}</span>
              <span>
                <span className="font-semibold">{p.t}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-black/55">{p.d}</span>
              </span>
            </li>
          ))}
        </ol>
        <Nota><Rich>{g.ativarNota}</Rich></Nota>
      </Section>

      <Section title={g.agenteTitle}>
        <p className="text-[15px] leading-relaxed"><Rich>{g.agente}</Rich></p>
      </Section>
    </div>
  );
}

function Campanhas({ t }: { t: GuiaDict }) {
  const c = t.campanhas;
  return (
    <ModuleTab icon="📣" title={c.title} subtitle={c.subtitle} tag={c.tag}>
      <p><Rich>{c.p1}</Rich></p>
      <Lista itens={c.itens} />
      <p><Rich>{c.p2}</Rich></p>
      <Nota><Rich>{c.nota1}</Rich></Nota>
      <Nota><Rich>{c.nota2}</Rich></Nota>
    </ModuleTab>
  );
}

function Pipeline({ t }: { t: GuiaDict }) {
  const p = t.pipeline;
  const cores = ["bg-slate-100 text-slate-700", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-800", "bg-rose-100 text-rose-700"];
  return (
    <ModuleTab icon="📊" title={p.title} subtitle={p.subtitle} tag={p.tag}>
      <p><Rich>{p.p1}</Rich></p>
      <div className="mt-4 space-y-2">
        {p.fases.map((f, i) => (
          <Fase key={i} cor={cores[i] ?? cores[0]} nome={f.nome} desc={f.desc} />
        ))}
      </div>
      <Nota>{p.nota}</Nota>
    </ModuleTab>
  );
}

function Consultoria({ t }: { t: GuiaDict }) {
  const c = t.consultoria;
  return (
    <ModuleTab icon="🧠" title={c.title} subtitle={c.subtitle} tag={c.tag}>
      <p><Rich>{c.p1}</Rich></p>
      <Lista itens={c.itens} />
      <Nota>{c.nota}</Nota>
    </ModuleTab>
  );
}

function Configuracoes({ t }: { t: GuiaDict }) {
  const c = t.configuracoes;
  return (
    <ModuleTab icon="⚙️" title={c.title} subtitle={c.subtitle} tag={c.tag}>
      <p>{c.intro}</p>
      <p className="font-semibold text-black/90">{c.whatsappTitle}</p>
      <Lista itens={c.whatsappItens} />
      <p className="font-semibold text-black/90">{c.metaTitle}</p>
      <Lista itens={c.metaItens} />
      <Nota>{c.metaNota}</Nota>
      <p className="font-semibold text-black/90">{c.gmailTitle}</p>
      <Lista itens={c.gmailItens} />
      <Nota>{c.gmailNota}</Nota>
      <p className="font-semibold text-black/90">{c.discordTitle}</p>
      <Lista itens={c.discordItens} />
      <Nota>{c.notaFinal}</Nota>
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

function ModuleTab({ icon, title, subtitle, tag, children }: { icon: string; title: string; subtitle: string; tag: string; children: React.ReactNode }) {
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
        <li key={i} className="flex gap-2"><span className="text-emerald-600">✓</span><span>{t}</span></li>
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
