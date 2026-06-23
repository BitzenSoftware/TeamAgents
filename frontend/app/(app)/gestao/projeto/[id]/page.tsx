"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FolderKanban, Send, Loader2, Paperclip, Trash2, FileDown, Bot, FileText,
} from "lucide-react";
import { marked } from "marked";
import {
  ReactFlow, Background, Controls, type Node, type Edge, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api, type GrowthMensagem, type Projeto, type ProjetoDocumento } from "@/lib/api";
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

type Aba = "agentes" | "contexto" | "fluxo";

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
        {([["agentes", "Agentes"], ["contexto", "Contexto"], ["fluxo", "Fluxo"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition ${aba === k ? "border-brand text-brand" : "border-transparent text-black/50 hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        {aba === "agentes" && <AbaAgentes proj={proj} />}
        {aba === "contexto" && <AbaContexto proj={proj} onChange={carregar} />}
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
  const fimRef = useRef<HTMLDivElement>(null);

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
                  <button type="button" onClick={() => exportarPdf(renderMd(m.content), `${proj.nome} — ${agenteInfo(sel)?.nome ?? sel}`)}
                    className="ml-1 inline-flex items-center gap-1 text-[11px] font-medium text-black/40 hover:text-brand"><FileDown size={12} /> Baixar PDF</button>
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

/* ============================ Aba Fluxo (React Flow) ============================ */
function AbaFluxo({ proj }: { proj: Projeto }) {
  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    // Centro: contexto do projeto
    ns.push({
      id: "contexto", position: { x: 0, y: 0 },
      data: { label: `📁 ${proj.nome}\n(contexto compartilhado)` },
      style: { width: 200, padding: 10, borderRadius: 12, border: "2px solid #4f46e5", background: "#eef0ff", fontWeight: 600, whiteSpace: "pre-line", textAlign: "center" },
    });
    // Maestro: cliente
    ns.push({
      id: "cliente", position: { x: 0, y: -160 },
      data: { label: "🧑‍💼 Você (maestro)" },
      style: { width: 160, padding: 8, borderRadius: 999, border: "1px solid #ccc", background: "#fff", textAlign: "center" },
    });
    es.push({ id: "e-cliente", source: "cliente", target: "contexto", markerEnd: { type: MarkerType.ArrowClosed }, label: "consulta" });
    // Agentes em volta
    const n = proj.agente_ids.length || 1;
    const R = 260;
    proj.agente_ids.forEach((aid, i) => {
      const info = agenteInfo(aid);
      const ang = (Math.PI * 2 * i) / n + Math.PI / 2;
      ns.push({
        id: aid, position: { x: Math.round(Math.cos(ang) * R), y: Math.round(Math.sin(ang) * R) + 60 },
        data: { label: info?.nome ?? aid },
        style: { width: 150, padding: 8, borderRadius: 10, border: "1px solid #d4d4d8", background: "#fff", fontSize: 12, textAlign: "center" },
      });
      es.push({ id: `e-${aid}`, source: aid, target: "contexto", animated: true, label: "lê o contexto", style: { stroke: "#a5b4fc" } });
    });
    return { nodes: ns, edges: es };
  }, [proj]);

  if (proj.agente_ids.length === 0) {
    return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Adicione agentes ao projeto para ver o fluxo.</p>;
  }

  return (
    <div className="h-full overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="border-b border-black/10 px-4 py-2 text-xs text-black/50">
        Os agentes são especialistas <strong>independentes</strong> que compartilham o contexto do projeto. Você é o maestro — eles não se chamam entre si.
      </div>
      <div className="h-[calc(100%-37px)]">
        <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
