"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Send, Loader2, Paperclip, Trash2, FileDown, Bot, FileText,
  ClipboardList, Save, Plus, Play, Crown, ShieldCheck, ChevronDown,
} from "lucide-react";
import { marked } from "marked";
import {
  ReactFlow, Background, type Node, type Edge, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  api, type FluxoExecucao, type GrowthMensagem, type PapelAgente, type Playbook,
  type Projeto, type ProjetoDocumento, type ProjetoRelatorio,
} from "@/lib/api";
import { agenteInfo } from "@/lib/agentes";

const renderMd = (c: string) => marked.parse(c, { async: false }) as string;
function exportarPdf(html: string, titulo: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${titulo}</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;max-width:720px;margin:32px auto;padding:0 16px;line-height:1.5}
    table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}</style>
    </head><body><h2>${titulo}</h2>${html}<script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

type Aba = "agentes" | "contexto" | "relatorios" | "fluxo";

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proj, setProj] = useState<Projeto | null>(null);
  const [aba, setAba] = useState<Aba>("agentes");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.projeto(id).then(setProj).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  if (erro) return <div className="p-6"><p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p></div>;
  if (!proj) return <div className="p-6 text-sm text-black/40">Carregando…</div>;

  return (
    <div className="flex h-screen flex-col p-6">
      <button onClick={() => router.push("/gestao")} className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm text-black/50 hover:text-ink">
        <ArrowLeft size={15} /> Voltar para Gestão
      </button>
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><FolderKanban size={20} /></span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{proj.nome}</h1>
          {proj.descricao && <p className="truncate text-sm text-black/50">{proj.descricao}</p>}
        </div>
      </header>

      <div className="mb-4 flex gap-1 border-b border-black/10">
        {([["agentes", "Agentes"], ["contexto", "Contexto"], ["relatorios", "Relatórios"], ["fluxo", "Fluxo"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition ${aba === k ? "border-brand text-brand" : "border-transparent text-black/50 hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {aba === "agentes" && <AbaAgentes proj={proj} />}
        {aba === "contexto" && <AbaContexto proj={proj} onChange={carregar} />}
        {aba === "relatorios" && <AbaRelatorios proj={proj} />}
        {aba === "fluxo" && <AbaFluxo proj={proj} />}
      </div>
    </div>
  );
}

/* ============================ Aba Agentes ============================ */
function AbaAgentes({ proj }: { proj: Projeto }) {
  const [sel, setSel] = useState<string>(proj.agente_ids[0] ?? "");
  const [msgs, setMsgs] = useState<GrowthMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salvoIdx, setSalvoIdx] = useState<number | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  async function salvarRelatorio(i: number, conteudo: string) {
    const titulo = (conteudo.split("\n").map((s) => s.trim()).find(Boolean) || "Relatório")
      .replace(/[#>*_`]/g, "").trim().slice(0, 80);
    try {
      await api.projetoRelatorioAdd(proj.id, { titulo, conteudo, agente_id: sel });
      setSalvoIdx(i);
      setTimeout(() => setSalvoIdx((v) => (v === i ? null : v)), 2500);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!sel) return;
    api.projetoMensagens(proj.id, sel).then(setMsgs).catch(() => setMsgs([]));
  }, [sel, proj.id]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, enviando]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando || !sel) return;
    setMsgs((l) => [...l, { role: "user", content: t }]);
    setTexto(""); setEnviando(true);
    try {
      const { resposta } = await api.projetoChat(proj.id, sel, t);
      setMsgs((l) => [...l, { role: "assistant", content: resposta }]);
    } catch (err) {
      setMsgs((l) => [...l, { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : String(err)}` }]);
    } finally { setEnviando(false); }
  }

  if (proj.agente_ids.length === 0) {
    return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Este projeto não tem agentes. Edite o projeto na Gestão para adicionar.</p>;
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="space-y-1.5">
          {proj.agente_ids.map((aid) => {
            const info = agenteInfo(aid); const Ico = info?.icon ?? Bot; const on = aid === sel;
            return (
              <button key={aid} onClick={() => setSel(aid)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${on ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"}`}>
                <Ico size={16} className={on ? "text-brand" : info?.cor} />
                <span className={`truncate text-sm ${on ? "font-semibold text-brand" : "font-medium"}`}>{info?.nome ?? aid}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="lg:col-span-9 min-h-0">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-4 py-2.5 text-sm font-semibold">{agenteInfo(sel)?.nome ?? sel}</div>
          <div className="flex-1 space-y-3 overflow-auto p-4">
            {msgs.length === 0 && <p className="grid h-full place-items-center text-center text-sm text-black/35">Converse com este agente. Ele já conhece o contexto do projeto.</p>}
            {msgs.map((m, i) => {
              const meu = m.role === "user";
              if (meu) return (
                <div key={i} className="flex justify-end"><div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-3.5 py-2 text-sm leading-relaxed text-white">{m.content}</div></div>
              );
              return (
                <div key={i} className="flex flex-col items-start gap-1">
                  <div className="md max-w-[85%] rounded-2xl rounded-bl-sm border border-black/10 bg-paper px-3.5 py-2 text-sm leading-relaxed text-black/80" dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} />
                  <div className="ml-1 flex items-center gap-3">
                    <button type="button" onClick={() => salvarRelatorio(i, m.content)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-brand">
                      <Save size={12} /> {salvoIdx === i ? "Salvo em Relatórios ✓" : "Salvar como relatório"}
                    </button>
                    <button type="button" onClick={() => exportarPdf(renderMd(m.content), `${proj.nome} — ${agenteInfo(sel)?.nome ?? sel}`)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-brand"><FileDown size={12} /> Baixar PDF</button>
                  </div>
                </div>
              );
            })}
            {enviando && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm border border-black/10 bg-paper px-3.5 py-2 text-sm text-black/40"><Loader2 size={15} className="inline animate-spin" /> pensando…</div></div>}
            <div ref={fimRef} />
          </div>
          <form onSubmit={enviar} className="flex items-end gap-2 border-t border-black/10 p-3">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e as unknown as React.FormEvent); } }}
              placeholder="Escreva para o agente…" rows={1}
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"
              className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:opacity-90 disabled:opacity-40"><Send size={17} /></button>
          </form>
        </div>
      </section>
      <style>{`.md p{margin:.35rem 0}.md ul,.md ol{margin:.35rem 0;padding-left:1.15rem;list-style:revert}.md li{margin:.15rem 0}.md strong{font-weight:600}.md table{border-collapse:collapse;margin:.4rem 0;font-size:.9em}.md th,.md td{border:1px solid rgba(0,0,0,.15);padding:.2rem .45rem}`}</style>
    </div>
  );
}

/* ============================ Aba Contexto ============================ */
function AbaContexto({ proj, onChange }: { proj: Projeto; onChange: () => void }) {
  const [briefing, setBriefing] = useState(proj.briefing);
  const [salvando, setSalvando] = useState(false);
  const [docs, setDocs] = useState<ProjetoDocumento[]>([]);
  const [subindo, setSubindo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const carregarDocs = useCallback(() => { api.projetoDocumentos(proj.id).then(setDocs).catch(() => {}); }, [proj.id]);
  useEffect(() => { carregarDocs(); }, [carregarDocs]);

  async function salvarBriefing() { setSalvando(true); try { await api.atualizarProjeto(proj.id, { briefing }); onChange(); } finally { setSalvando(false); } }
  async function upload(fl: FileList | null) {
    if (!fl || fl.length === 0) return;
    setSubindo(true);
    try { await api.projetoUploadDocumentos(proj.id, Array.from(fl)); carregarDocs(); }
    finally { setSubindo(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="max-w-3xl space-y-5 overflow-auto">
      <div>
        <label className="mb-1 block text-sm font-medium">Briefing do projeto</label>
        <p className="mb-2 text-xs text-black/45">Contexto compartilhado — todos os agentes do projeto leem isto.</p>
        <textarea value={briefing} onChange={(e) => setBriefing(e.target.value)} rows={6}
          placeholder="Descreva o objetivo, o cenário, as restrições, o que os agentes precisam saber…"
          className="w-full resize-y rounded-lg border border-black/15 p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <button onClick={salvarBriefing} disabled={salvando}
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">{salvando ? "Salvando…" : "Salvar briefing"}</button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">Documentos do projeto</label>
          <input ref={fileRef} type="file" multiple accept=".pdf,.csv,.txt,.docx,.xlsx,.xlsm" className="hidden" aria-label="Anexar documento" onChange={(e) => upload(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} disabled={subindo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03] disabled:opacity-40">
            {subindo ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Anexar
          </button>
        </div>
        <p className="mb-2 text-xs text-black/45">PDF, CSV, Word, Excel. O texto é extraído e vira contexto compartilhado.</p>
        {docs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">Nenhum documento ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm">
                <FileText size={14} className="shrink-0 text-black/30" />
                <span className="min-w-0 flex-1 truncate">{d.nome}</span>
                <button onClick={() => api.projetoApagarDocumento(proj.id, d.id).then(carregarDocs)} aria-label="Apagar"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-black/35 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ Aba Fluxo — orquestração multi-agente (Organograma Vivo) ============ */
const ST_ETAPA: Record<string, { label: string; cor: string; bg: string }> = {
  pendente: { label: "pendente", cor: "#a1a1aa", bg: "#fafafa" },
  rodando: { label: "trabalhando…", cor: "#4f46e5", bg: "#eef0ff" },
  revisao: { label: "em revisão…", cor: "#d97706", bg: "#fffbeb" },
  refazendo: { label: "refazendo…", cor: "#d97706", bg: "#fffbeb" },
  concluida: { label: "concluída", cor: "#059669", bg: "#ecfdf5" },
  erro: { label: "erro", cor: "#e11d48", bg: "#fff1f2" },
};
const ST_EXEC: Record<FluxoExecucao["status"], string> = {
  planejando: "🧠 Gerente planejando…",
  rodando: "⚙️ Equipe trabalhando…",
  concluida: "✅ Concluída",
  erro: "⚠️ Erro",
  sem_creditos: "💳 Sem créditos",
};
const PAPEL_LABEL: Record<PapelAgente, string> = { gerente: "Gerente", executor: "Executor", revisor: "Revisor" };

function AbaFluxo({ proj }: { proj: Projeto }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [papeis, setPapeis] = useState<Record<string, PapelAgente>>({});
  const [revisaoAtiva, setRevisaoAtiva] = useState(true);
  const [salvandoPapeis, setSalvandoPapeis] = useState(false);
  const [papeisAberto, setPapeisAberto] = useState(false);
  const [execs, setExecs] = useState<FluxoExecucao[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [det, setDet] = useState<FluxoExecucao | null>(null);
  const [comando, setComando] = useState("");
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  // Papéis efetivos (defaults do backend: Projetos gerencia, Auditoria revisa).
  const gerenteEfetivo = useMemo(() => {
    const g = Object.entries(papeis).find(([, p]) => p === "gerente")?.[0];
    return g ?? (proj.agente_ids.includes("projetos") ? "projetos" : proj.agente_ids[0]);
  }, [papeis, proj.agente_ids]);
  const revisorEfetivo = useMemo(() => {
    const r = Object.entries(papeis).find(([a, p]) => p === "revisor" && a !== gerenteEfetivo)?.[0];
    return r ?? (proj.agente_ids.includes("auditoria") && gerenteEfetivo !== "auditoria" ? "auditoria" : null);
  }, [papeis, proj.agente_ids, gerenteEfetivo]);

  useEffect(() => { api.playbooks().then(setPlaybooks).catch(() => {}); }, []);
  useEffect(() => {
    api.projetoPapeis(proj.id).then((r) => { setPapeis(r.papeis); setRevisaoAtiva(r.revisao_ativa); }).catch(() => {});
  }, [proj.id]);
  const carregarExecs = useCallback(() => {
    api.fluxos(proj.id).then((l) => { setExecs(l); setSelId((cur) => cur ?? l[0]?.id ?? null); }).catch(() => {});
  }, [proj.id]);
  useEffect(() => { carregarExecs(); }, [carregarExecs]);

  // Carrega o detalhe ao selecionar; enquanto ativo, repete a cada 2.5s.
  useEffect(() => {
    if (!selId) { setDet(null); return; }
    api.fluxo(selId).then(setDet).catch(() => setDet(null));
  }, [selId]);
  useEffect(() => {
    if (!selId || !det || (det.status !== "planejando" && det.status !== "rodando")) return;
    const t = setTimeout(() => {
      api.fluxo(selId).then(setDet).catch(() => {});
      api.fluxos(proj.id).then(setExecs).catch(() => {});
    }, 2500);
    return () => clearTimeout(t);
  }, [selId, det, proj.id]);

  async function iniciar(playbook?: string) {
    if (iniciando) return;
    setIniciando(true); setErro(null);
    try {
      const ex = await api.fluxoIniciar(proj.id, playbook ? { playbook } : { comando: comando.trim() });
      setComando("");
      setExecs((l) => [ex, ...l]); setSelId(ex.id); setDet(ex);
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setIniciando(false); }
  }

  async function salvarPapeis() {
    setSalvandoPapeis(true);
    try {
      const r = await api.projetoSetPapeis(proj.id, papeis, revisaoAtiva);
      setPapeis(r.papeis); setRevisaoAtiva(r.revisao_ativa);
    } finally { setSalvandoPapeis(false); }
  }

  const etapas = det?.etapas ?? [];
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    if (!det) return { nodes: ns, edges: es };
    ns.push({
      id: "gerente", position: { x: 0, y: 0 },
      data: { label: `👑 ${agenteInfo(gerenteEfetivo)?.nome ?? gerenteEfetivo}\n(Gerente)` },
      style: { width: 170, padding: 8, borderRadius: 12, border: "2px solid #4f46e5", background: "#eef0ff", fontSize: 12, fontWeight: 600, whiteSpace: "pre-line", textAlign: "center" },
    });
    etapas.forEach((e, i) => {
      const st = ST_ETAPA[e.status] ?? ST_ETAPA.pendente;
      const ativo = e.status === "rodando" || e.status === "revisao" || e.status === "refazendo";
      ns.push({
        id: e.id, position: { x: (i + 1) * 200, y: (i % 2) * 70 },
        data: { label: `${agenteInfo(e.agente_id)?.nome ?? e.agente_id}\n${st.label}` },
        style: { width: 165, padding: 8, borderRadius: 10, border: `2px solid ${st.cor}`, background: st.bg, fontSize: 12, whiteSpace: "pre-line", textAlign: "center" },
      });
      es.push({
        id: `e-${e.id}`, source: i === 0 ? "gerente" : etapas[i - 1].id, target: e.id,
        animated: ativo, markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: ativo ? "#4f46e5" : "#d4d4d8" },
      });
    });
    return { nodes: ns, edges: es };
  }, [det, etapas, gerenteEfetivo]);

  if (proj.agente_ids.length === 0) {
    return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Adicione agentes ao projeto para montar a equipe.</p>;
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto lg:grid-cols-12 lg:overflow-hidden">
      {/* Coluna esquerda: nova execução + papéis + histórico */}
      <aside className="flex min-h-0 flex-col gap-3 lg:col-span-4 lg:overflow-auto">
        <div className="rounded-xl border border-black/10 bg-white p-3">
          <div className="mb-2 text-sm font-semibold">Nova execução</div>
          <div className="space-y-1.5">
            {playbooks.map((p) => (
              <button key={p.id} type="button" onClick={() => iniciar(p.id)} disabled={iniciando}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-left transition hover:border-brand/40 hover:bg-brand/5 disabled:opacity-40">
                <span className="flex items-center gap-1.5 text-sm font-medium"><Play size={13} className="text-brand" /> {p.nome}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-black/45">{p.descricao}</span>
              </button>
            ))}
          </div>
          <div className="my-2 flex items-center gap-2 text-[11px] text-black/35"><span className="h-px flex-1 bg-black/10" />ou comando livre ao Gerente<span className="h-px flex-1 bg-black/10" /></div>
          <textarea value={comando} onChange={(e) => setComando(e.target.value)} rows={2}
            placeholder={`Ex.: criar o cronograma completo do projeto e um mapa de riscos com base em análise SWOT`}
            className="w-full resize-y rounded-lg border border-black/15 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          <button type="button" onClick={() => iniciar()} disabled={iniciando || !comando.trim()}
            className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {iniciando ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Executar com a equipe
          </button>
          {erro && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-3">
          <button type="button" onClick={() => setPapeisAberto((v) => !v)} className="flex w-full items-center justify-between text-sm font-semibold">
            <span className="inline-flex items-center gap-1.5"><Crown size={14} className="text-amber-500" /> Papéis da equipe</span>
            <ChevronDown size={15} className={`text-black/40 transition ${papeisAberto ? "rotate-180" : ""}`} />
          </button>
          <p className="mt-1 text-[11px] text-black/45">
            Gerente: <strong>{agenteInfo(gerenteEfetivo)?.nome ?? gerenteEfetivo}</strong>
            {revisaoAtiva && revisorEfetivo
              ? <> · Revisor: <strong>{agenteInfo(revisorEfetivo)?.nome ?? revisorEfetivo}</strong></>
              : <> · <span className="text-amber-600">Revisão desativada</span></>}
          </p>
          {papeisAberto && (
            <div className="mt-2 space-y-1.5">
              {proj.agente_ids.map((aid) => {
                const info = agenteInfo(aid); const Ico = info?.icon ?? Bot;
                return (
                  <div key={aid} className="flex items-center gap-2 text-sm">
                    <Ico size={14} className={info?.cor} />
                    <span className="min-w-0 flex-1 truncate">{info?.nome ?? aid}</span>
                    <select value={papeis[aid] ?? "executor"} aria-label={`Papel de ${info?.nome ?? aid}`}
                      onChange={(e) => setPapeis((p) => ({ ...p, [aid]: e.target.value as PapelAgente }))}
                      className="rounded-lg border border-black/15 px-2 py-1 text-xs outline-none focus:border-brand">
                      {(Object.keys(PAPEL_LABEL) as PapelAgente[]).map((p) => <option key={p} value={p}>{PAPEL_LABEL[p]}</option>)}
                    </select>
                  </div>
                );
              })}
              <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-lg border border-black/10 bg-black/[0.02] p-2">
                <input type="checkbox" checked={revisaoAtiva} onChange={(e) => setRevisaoAtiva(e.target.checked)}
                  className="mt-0.5 accent-brand" />
                <span className="min-w-0 text-xs">
                  <span className="font-medium">Revisão de qualidade (quality gate)</span>
                  <span className="block text-[11px] leading-snug text-black/45">
                    O Revisor confere cada entrega e devolve o que não passar. Desativar torna o fluxo mais rápido e barato, sem conferência.
                  </span>
                </span>
              </label>
              <button type="button" onClick={salvarPapeis} disabled={salvandoPapeis}
                className="mt-1 w-full rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03] disabled:opacity-40">
                {salvandoPapeis ? "Salvando…" : "Salvar papéis"}
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 space-y-1.5">
          {execs.length === 0 && (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
              Nenhuma execução ainda. Escolha um playbook ou dê um comando — a equipe trabalha em cadeia e o Revisor confere cada entrega.
            </p>
          )}
          {execs.map((ex) => {
            const on = ex.id === selId;
            return (
              <button key={ex.id} type="button" onClick={() => setSelId(ex.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${on ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"}`}>
                <span className={`block truncate text-sm ${on ? "font-semibold text-brand" : "font-medium"}`}>{ex.titulo || "Fluxo"}</span>
                <span className="block text-[11px] text-black/45">{ST_EXEC[ex.status]} · {new Date(ex.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Coluna direita: execução ao vivo */}
      <section className="min-h-0 lg:col-span-8">
        {!det ? (
          <div className="grid h-full min-h-[300px] place-items-center rounded-xl border border-black/10 bg-white p-6 text-center text-sm text-black/40">
            Escolha um playbook ou dê um comando livre.<br />O Gerente decompõe em tarefas, os especialistas produzem em cadeia e o Revisor aprova cada entrega.
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
            <div className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{det.titulo || "Fluxo"}</div>
                <div className="text-[11px] text-black/45">
                  {ST_EXEC[det.status]}{det.creditos > 0 && ` · ${det.creditos} créditos`}
                </div>
              </div>
              {det.status === "concluida" && det.resumo && (
                <button type="button" onClick={() => exportarPdf(renderMd(det.resumo), `${proj.nome} — ${det.titulo}`)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-black/60 hover:bg-black/[0.03]">
                  <FileDown size={13} /> PDF
                </button>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              {etapas.length > 0 && (
                <div className="h-44 border-b border-black/10">
                  <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}
                    nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}>
                    <Background />
                  </ReactFlow>
                </div>
              )}

              <div className="space-y-2 p-4">
                {det.status === "planejando" && (
                  <p className="flex items-center gap-2 text-sm text-black/50"><Loader2 size={15} className="animate-spin" /> O Gerente está decompondo o comando em tarefas para a equipe…</p>
                )}
                {(det.status === "erro" || det.status === "sem_creditos") && det.erro && (
                  <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{det.erro}</p>
                )}

                {etapas.map((e) => {
                  const st = ST_ETAPA[e.status] ?? ST_ETAPA.pendente;
                  const info = agenteInfo(e.agente_id); const Ico = info?.icon ?? Bot;
                  const aberto = aberta === e.id;
                  return (
                    <div key={e.id} className="overflow-hidden rounded-lg border border-black/10">
                      <button type="button" onClick={() => setAberta(aberto ? null : e.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.02]">
                        <Ico size={15} className={info?.cor} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{info?.nome ?? e.agente_id}</span>
                          <span className="block truncate text-[11px] text-black/45">{e.tarefa}</span>
                        </span>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: st.cor, background: st.bg }}>
                          {(e.status === "rodando" || e.status === "revisao" || e.status === "refazendo") && <Loader2 size={10} className="mr-1 inline animate-spin" />}
                          {st.label}
                        </span>
                        <ChevronDown size={14} className={`shrink-0 text-black/30 transition ${aberto ? "rotate-180" : ""}`} />
                      </button>
                      {aberto && (
                        <div className="border-t border-black/10 px-3 py-2.5">
                          {e.revisao && (
                            <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50/60 p-2 text-xs text-amber-800">
                              <ShieldCheck size={13} className="mt-0.5 shrink-0" /> <span className="whitespace-pre-wrap">{e.revisao}</span>
                            </p>
                          )}
                          {e.resultado ? (
                            <>
                              <div className="md text-sm leading-relaxed text-black/80" dangerouslySetInnerHTML={{ __html: renderMd(e.resultado) }} />
                              <button type="button" onClick={() => exportarPdf(renderMd(e.resultado), `${proj.nome} — ${info?.nome ?? e.agente_id}`)}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-brand"><FileDown size={12} /> Baixar PDF</button>
                            </>
                          ) : (
                            <p className="text-xs text-black/40">Sem entrega ainda.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {det.resumo && (
                  <div className="rounded-lg border-2 border-brand/30 bg-brand/[0.04] p-3">
                    <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand">
                      <Crown size={14} /> Síntese do Gerente
                    </div>
                    <div className="md text-sm leading-relaxed text-black/80" dangerouslySetInnerHTML={{ __html: renderMd(det.resumo) }} />
                    <p className="mt-2 text-[11px] text-black/40">Salva automaticamente em Relatórios — todos os agentes do projeto passam a conhecer este resultado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
      <style>{`.md p{margin:.35rem 0}.md ul,.md ol{margin:.35rem 0;padding-left:1.15rem;list-style:revert}.md li{margin:.15rem 0}.md strong{font-weight:600}.md h1,.md h2,.md h3{font-weight:700;margin:.5rem 0 .25rem}.md table{border-collapse:collapse;margin:.4rem 0;font-size:.9em}.md th,.md td{border:1px solid rgba(0,0,0,.15);padding:.2rem .45rem}`}</style>
    </div>
  );
}

/* ============================ Aba Relatórios ============================ */
function AbaRelatorios({ proj }: { proj: Projeto }) {
  const [lista, setLista] = useState<ProjetoRelatorio[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    api.projetoRelatorios(proj.id).then((rs) => {
      setLista(rs);
      setSelId((cur) => (cur && rs.some((r) => r.id === cur) ? cur : rs[0]?.id ?? null));
    }).catch(() => {});
  }, [proj.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const sel = lista.find((r) => r.id === selId) ?? null;

  async function criar() {
    if (!conteudo.trim() || salvando) return;
    setSalvando(true);
    try {
      const r = await api.projetoRelatorioAdd(proj.id, { titulo: titulo.trim() || "Relatório", conteudo });
      setNovo(false); setTitulo(""); setConteudo("");
      const rs = await api.projetoRelatorios(proj.id);
      setLista(rs); setSelId(r.id);
    } finally { setSalvando(false); }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar este relatório?")) return;
    await api.projetoApagarRelatorio(proj.id, id);
    carregar();
  }

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Lista (cartões) */}
      <aside className="flex min-h-0 flex-col lg:col-span-4">
        <button type="button" onClick={() => { setNovo(true); setSelId(null); }}
          className="mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={15} /> Novo relatório
        </button>
        <div className="min-h-0 flex-1 space-y-1.5 overflow-auto">
          {lista.length === 0 && (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
              Nenhum relatório. Salve uma resposta na aba <strong>Agentes</strong>.
            </p>
          )}
          {lista.map((r) => {
            const on = !novo && r.id === selId;
            const origem = r.agente_id ? agenteInfo(r.agente_id)?.nome : null;
            return (
              <button key={r.id} type="button" onClick={() => { setSelId(r.id); setNovo(false); }}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition ${on ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"}`}>
                <ClipboardList size={15} className={`mt-0.5 shrink-0 ${on ? "text-brand" : "text-black/30"}`} />
                <span className="min-w-0">
                  <span className={`block truncate text-sm ${on ? "font-semibold text-brand" : "font-medium"}`}>{r.titulo}</span>
                  <span className="block truncate text-[11px] text-black/40">
                    {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}{origem && ` · ${origem}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Detalhe */}
      <section className="min-h-0 lg:col-span-8">
        {novo ? (
          <div className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-4">
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título do relatório / plano de ação"
              className="mb-2 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Conteúdo (markdown)…"
              className="min-h-0 flex-1 resize-none rounded-lg border border-black/15 p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setNovo(false); setSelId(lista[0]?.id ?? null); }} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5">Cancelar</button>
              <button type="button" onClick={criar} disabled={salvando || !conteudo.trim()}
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">{salvando ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        ) : sel ? (
          <div className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
            <div className="flex items-start justify-between gap-2 border-b border-black/10 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{sel.titulo}</div>
                <div className="text-[11px] text-black/40">
                  {new Date(sel.created_at).toLocaleString("pt-BR")}{sel.agente_id && ` · via ${agenteInfo(sel.agente_id)?.nome ?? sel.agente_id}`}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => exportarPdf(renderMd(sel.conteudo), sel.titulo)} aria-label="Baixar PDF"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-black/50 hover:bg-black/[0.03] hover:text-brand"><FileDown size={15} /></button>
                <button type="button" onClick={() => apagar(sel.id)} aria-label="Apagar"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-black/40 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="md flex-1 overflow-auto p-4 text-sm leading-relaxed text-black/80" dangerouslySetInnerHTML={{ __html: renderMd(sel.conteudo) }} />
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-xl border border-black/10 bg-white text-sm text-black/40">
            Selecione um relatório à esquerda.
          </div>
        )}
      </section>

      <style>{`.md p{margin:.4rem 0}.md ul,.md ol{margin:.4rem 0;padding-left:1.2rem;list-style:revert}.md li{margin:.2rem 0}.md strong{font-weight:600}.md h1,.md h2,.md h3{font-weight:700;margin:.6rem 0 .3rem}.md table{border-collapse:collapse;margin:.5rem 0;font-size:.92em;width:100%}.md th,.md td{border:1px solid rgba(0,0,0,.15);padding:.3rem .5rem;text-align:left}.md code{background:rgba(0,0,0,.06);padding:.05rem .25rem;border-radius:.25rem}`}</style>
    </div>
  );
}
