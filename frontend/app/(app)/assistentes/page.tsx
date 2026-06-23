"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Wallet, Scale, LifeBuoy, Package, Send, Loader2, Sparkles, ChevronDown,
  Users, ShieldCheck, FolderKanban, Target, TrendingUp, Workflow, type LucideIcon,
} from "lucide-react";
import { marked } from "marked";
import { api, type GrowthMensagem, type Habilidade } from "@/lib/api";

function renderMd(conteudo: string): string {
  return marked.parse(conteudo, { async: false }) as string;
}

type Assistente = { id: string; nome: string; chip: string; cor: string; icon: LucideIcon; intro: string; exemplos: string[] };

const ASSISTENTES: Assistente[] = [
  {
    id: "financeiro", nome: "Agente Financeiro", chip: "Finanças", cor: "text-emerald-600", icon: Wallet,
    intro: "Seu consultor financeiro: precificação, fluxo de caixa, custos e metas.",
    exemplos: ["Como precificar um procedimento de R$ 1.200 de custo?", "Monte um fluxo de caixa simples", "Quanto preciso faturar pra ter R$ 10 mil de lucro?"],
  },
  {
    id: "juridico", nome: "Agente Jurídico", chip: "Jurídico", cor: "text-indigo-600", icon: Scale,
    intro: "Orientação jurídica do dia a dia: contratos, LGPD, termos de consentimento.",
    exemplos: ["Crie um termo de consentimento para procedimento estético", "O que preciso fazer pra ficar em dia com a LGPD?", "Revise os riscos de um contrato de fornecedor"],
  },
  {
    id: "suporte", nome: "Agente de Suporte", chip: "Suporte", cor: "text-sky-600", icon: LifeBuoy,
    intro: "Resolve problemas e ajuda a responder bem os seus clientes.",
    exemplos: ["Como respondo um cliente que reclamou do resultado?", "Monte um FAQ dos meus serviços", "Escreva uma resposta para um cliente irritado"],
  },
  {
    id: "produto", nome: "Agente de Produto", chip: "Produto", cor: "text-amber-600", icon: Package,
    intro: "Estratégia de oferta: pacotes, posicionamento e novas frentes.",
    exemplos: ["Sugira combos de serviços pra aumentar o ticket", "Como posicionar meu serviço premium?", "Vale a pena lançar um novo serviço X?"],
  },
  {
    id: "rh", nome: "Agente de RH / Pessoas", chip: "RH", cor: "text-rose-600", icon: Users,
    intro: "Contratar melhor, desenvolver pessoas e reduzir risco trabalhista.",
    exemplos: ["Crie uma descrição de vaga para recepcionista", "Monte um roteiro de entrevista", "Como dar um feedback difícil?"],
  },
  {
    id: "auditoria", nome: "Agente de Auditoria Interna", chip: "Auditoria", cor: "text-teal-600", icon: ShieldCheck,
    intro: "Identifica riscos, inconsistências e oportunidades de melhoria.",
    exemplos: ["Revise meu processo de agendamento e aponte riscos", "Estou em dia com a LGPD?", "Onde posso estar perdendo dinheiro?"],
  },
  {
    id: "projetos", nome: "Agente de Projetos", chip: "Projetos", cor: "text-cyan-600", icon: FolderKanban,
    intro: "Organiza entregas, prazos, riscos e comunicação.",
    exemplos: ["Monte um plano para inaugurar uma nova sala", "Quais riscos desse projeto?", "Crie um cronograma de 4 semanas"],
  },
  {
    id: "estrategia", nome: "Agente de Estratégia", chip: "Estratégia", cor: "text-violet-600", icon: Target,
    intro: "Visão macro, decisões difíceis, OKRs e priorização.",
    exemplos: ["Defina meus OKRs do trimestre", "Vale mais investir em anúncio ou contratar?", "Me ajude a priorizar o que fazer primeiro"],
  },
  {
    id: "crescimento", nome: "Agente de Growth", chip: "Growth", cor: "text-emerald-600", icon: TrendingUp,
    intro: "Aquisição, retenção, monetização e experimentos.",
    exemplos: ["Sugira 3 experimentos pra trazer mais clientes", "Como reduzir o churn?", "Ideias de upsell pra aumentar a receita"],
  },
  {
    id: "operacoes", nome: "Agente de Operações", chip: "Operações", cor: "text-slate-600", icon: Workflow,
    intro: "Processos, SOPs, rotinas e eficiência — um negócio previsível.",
    exemplos: ["Mapeie meu processo de atendimento e ache gargalos", "Crie um SOP para o agendamento", "Monte um checklist de onboarding de funcionário"],
  },
];

export default function AssistentesPage() {
  const [sel, setSel] = useState<Assistente>(ASSISTENTES[0]);
  const [msgs, setMsgs] = useState<GrowthMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  // Habilidades: todas as ativas; as deste agente (+ globais) ficam selecionáveis.
  const [todasHabs, setTodasHabs] = useState<Habilidade[]>([]);
  const [selHabs, setSelHabs] = useState<Set<string>>(new Set());
  const [habsAberto, setHabsAberto] = useState(false);

  useEffect(() => { api.habilidades().then((hs) => setTodasHabs(hs.filter((h) => h.ativo))).catch(() => {}); }, []);

  const disponiveis = useMemo(
    () => todasHabs.filter((h) => h.agente === sel.id || h.agente === "global"),
    [todasHabs, sel.id],
  );

  // Ao trocar de agente (ou quando as habilidades carregam): seleciona todas por padrão.
  useEffect(() => { setSelHabs(new Set(disponiveis.map((h) => h.id))); }, [disponiveis]);

  useEffect(() => { setMsgs([]); setTexto(""); setHabsAberto(false); }, [sel.id]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, enviando]);

  function toggleHab(id: string) {
    setSelHabs((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function enviar(e: React.FormEvent, textoForcado?: string) {
    e.preventDefault();
    const t = (textoForcado ?? texto).trim();
    if (!t || enviando) return;
    const hist: GrowthMensagem[] = [...msgs, { role: "user", content: t }];
    setMsgs(hist); setTexto(""); setEnviando(true);
    try {
      const { resposta } = await api.assistenteChat(sel.id, hist, Array.from(selHabs));
      setMsgs((l) => [...l, { role: "assistant", content: resposta }]);
    } catch (err) {
      setMsgs((l) => [...l, { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Assistentes</h1>
        <p className="text-sm text-black/50">Especialistas para o seu negócio. Conhecem sua empresa pelas Habilidades que você cadastrar.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Seletor */}
        <aside className="lg:col-span-3">
          <div className="space-y-1.5">
            {ASSISTENTES.map((a) => {
              const on = a.id === sel.id;
              const Ico = a.icon;
              return (
                <button key={a.id} type="button" onClick={() => setSel(a)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    on ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"
                  }`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-black/8 bg-paper ${a.cor}`}>
                    <Ico size={17} />
                  </span>
                  <span className={`text-sm ${on ? "font-semibold text-brand" : "font-medium"}`}>{a.nome}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Chat */}
        <section className="lg:col-span-9">
          <div className="flex h-[calc(100vh-210px)] flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
            <div className="border-b border-black/10 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{sel.nome}</div>
                  <div className="text-xs text-black/45">{sel.intro}</div>
                </div>
                {/* Seletor de Habilidades deste agente */}
                <div className="relative shrink-0">
                  <button type="button" onClick={() => setHabsAberto((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-2.5 py-1.5 text-xs font-medium text-black/60 transition hover:bg-black/[0.03]">
                    <Sparkles size={13} className="text-brand" />
                    Habilidades ({selHabs.size}/{disponiveis.length})
                    <ChevronDown size={13} className={habsAberto ? "rotate-180 transition" : "transition"} />
                  </button>
                  {habsAberto && (
                    <div className="absolute right-0 z-20 mt-1 w-72 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
                      {disponiveis.length === 0 ? (
                        <p className="p-2 text-xs text-black/45">
                          Nenhuma Habilidade para este agente. Cadastre no menu{" "}
                          <Link href="/habilidades" className="font-medium text-brand hover:underline">Habilidades</Link>.
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between px-1 pb-1.5">
                            <button type="button" onClick={() => setSelHabs(new Set(disponiveis.map((h) => h.id)))}
                              className="text-[11px] font-medium text-brand hover:underline">Todas</button>
                            <button type="button" onClick={() => setSelHabs(new Set())}
                              className="text-[11px] text-black/40 hover:underline">Nenhuma</button>
                          </div>
                          <div className="max-h-60 space-y-0.5 overflow-auto">
                            {disponiveis.map((h) => (
                              <label key={h.id} className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-black/[0.03]">
                                <input type="checkbox" checked={selHabs.has(h.id)} onChange={() => toggleHab(h.id)} className="mt-0.5 shrink-0" />
                                <span className="min-w-0">
                                  <span className="font-medium">{h.titulo}</span>
                                  {h.agente === "global" && <span className="ml-1 rounded bg-black/5 px-1 py-0.5 text-[9px] text-black/40">global</span>}
                                </span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-4">
              {msgs.length === 0 && (
                <div className="grid h-full place-items-center">
                  <div className="max-w-md text-center">
                    <p className="mb-3 text-sm text-black/40">Comece a conversa ou escolha um exemplo:</p>
                    <div className="flex flex-col gap-2">
                      {sel.exemplos.map((ex) => (
                        <button key={ex} type="button"
                          onClick={(e) => enviar(e, ex)}
                          className="rounded-lg border border-black/10 px-3 py-2 text-left text-xs text-black/60 transition hover:border-brand/30 hover:bg-brand/5">
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {msgs.map((m, i) => {
                const meu = m.role === "user";
                return (
                  <div key={i} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                    {meu ? (
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm leading-relaxed text-white">
                        {m.content}
                      </div>
                    ) : (
                      <div className="md max-w-[85%] rounded-2xl rounded-bl-sm border border-black/10 bg-paper px-3.5 py-2 text-sm leading-relaxed text-black/80"
                        dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />
                    )}
                  </div>
                );
              })}
              {enviando && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-black/10 bg-paper px-3.5 py-2 text-sm text-black/40">
                    <Loader2 size={15} className="inline animate-spin" /> pensando…
                  </div>
                </div>
              )}
              <div ref={fimRef} />
            </div>
            <form onSubmit={enviar} className="flex items-end gap-2 border-t border-black/10 p-3">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e as unknown as React.FormEvent); } }}
                placeholder={`Pergunte ao ${sel.nome}…`} rows={1}
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:opacity-90 disabled:opacity-40">
                <Send size={17} />
              </button>
            </form>
          </div>
        </section>
      </div>

      <style>{`
        .md p{margin:.35rem 0}
        .md p:first-child{margin-top:0}
        .md p:last-child{margin-bottom:0}
        .md ul,.md ol{margin:.35rem 0;padding-left:1.15rem;list-style:revert}
        .md li{margin:.15rem 0}
        .md strong{font-weight:600}
        .md h1,.md h2,.md h3{font-weight:700;margin:.5rem 0 .25rem}
        .md code{background:rgba(0,0,0,.06);padding:.05rem .25rem;border-radius:.25rem;font-size:.85em}
        .md table{border-collapse:collapse;margin:.4rem 0;font-size:.9em}
        .md th,.md td{border:1px solid rgba(0,0,0,.15);padding:.2rem .45rem;text-align:left}
        .md a{color:#4f46e5;text-decoration:underline}
      `}</style>
    </div>
  );
}
