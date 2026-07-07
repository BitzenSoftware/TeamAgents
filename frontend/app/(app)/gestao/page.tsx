"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, FolderKanban, Check } from "lucide-react";
import { api, type Departamento, type Projeto } from "@/lib/api";
import { AGENTES_CATALOGO, agenteInfo } from "@/lib/agentes";
import { useT } from "@/components/i18n-context";

// Abre a janela do projeto numa aba própria do navegador.
const abrirProjeto = (pid: string) => window.open(`/gestao/projeto/${pid}`, "_blank", "noopener");

// Rótulo curto localizado de um agente (via dicionário assistentes), com fallback ao catálogo.
function useAgLabel() {
  const lista = useT().assistentes.lista;
  return (id: string) => lista[id]?.chip ?? agenteInfo(id)?.chip ?? id;
}

export default function GestaoPage() {
  const t = useT().gestao;
  const agLabel = useAgLabel();
  const [ativos, setAtivos] = useState<string[]>([]);
  const [deps, setDeps] = useState<Departamento[]>([]);
  const [depSel, setDepSel] = useState<string | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [modalDep, setModalDep] = useState<Departamento | "novo" | null>(null);
  const [modalProj, setModalProj] = useState<Projeto | "novo" | null>(null);

  const carregarDeps = useCallback(() => {
    api.departamentos().then(setDeps).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => {
    api.gestaoAgentes().then((r) => setAtivos(r.ativos)).catch(() => {});
    carregarDeps();
  }, [carregarDeps]);

  useEffect(() => {
    if (!depSel) { setProjetos([]); return; }
    api.projetos(depSel).then(setProjetos).catch(() => {});
  }, [depSel, modalProj]);

  const depAtual = deps.find((d) => d.id === depSel) ?? null;

  // Liga/desliga um agente da empresa e SALVA na hora (sem botão extra).
  async function toggleEmpresa(id: string) {
    const novo = ativos.includes(id) ? ativos.filter((x) => x !== id) : [...ativos, id];
    setAtivos(novo);
    try {
      const r = await api.gestaoSetAgentes(novo);
      setAtivos(r.ativos);
      carregarDeps();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="text-sm text-black/50">{t.subtitulo}</p>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {/* Nível Empresa: agentes ativos */}
      <section className="mb-6 rounded-xl border border-black/10 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{t.agentesAtivos}</div>
            <div className="text-xs text-black/45">{t.escolhaPre}{AGENTES_CATALOGO.length}{t.escolhaPos}</div>
          </div>
          <button onClick={() => setEditandoEmpresa((v) => !v)}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5">
            {editandoEmpresa ? t.concluir : t.editar}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {AGENTES_CATALOGO.map((a) => {
            const on = ativos.includes(a.id);
            const Ico = a.icon;
            if (!editandoEmpresa && !on) return null;
            return (
              <button key={a.id} type="button" disabled={!editandoEmpresa}
                onClick={() => toggleEmpresa(a.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  on ? "border-brand bg-brand/10 text-brand" : "border-black/15 text-black/50"
                } ${editandoEmpresa ? "cursor-pointer hover:bg-black/[0.03]" : ""}`}>
                <Ico size={13} className={a.cor} /> {agLabel(a.id)}
                {editandoEmpresa && on && <Check size={12} />}
              </button>
            );
          })}
          {!editandoEmpresa && ativos.length === 0 && (
            <span className="text-xs text-black/40">{t.nenhumAtivo}</span>
          )}
        </div>
        {editandoEmpresa && (
          <p className="mt-2 text-[11px] text-black/40">{t.salvasAuto}</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Departamentos */}
        <aside className="lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{t.departamentos}</span>
            <button onClick={() => setModalDep("novo")} disabled={ativos.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
              <Plus size={13} /> {t.novo}
            </button>
          </div>
          {deps.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
              {ativos.length === 0 ? t.ativePrimeiro : t.crieDep}
            </p>
          ) : (
            <div className="space-y-1.5">
              {deps.map((d) => {
                const on = d.id === depSel;
                return (
                  <div key={d.id} className={`group rounded-lg border px-3 py-2.5 transition ${on ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => setDepSel(d.id)} className="min-w-0 flex-1 text-left">
                        <div className={`truncate text-sm ${on ? "font-semibold text-brand" : "font-medium"}`}>{d.nome}</div>
                        <div className="mt-0.5 truncate text-[11px] text-black/40">{d.agente_ids.length} {t.agentesSuf}</div>
                      </button>
                      <div className="flex shrink-0 gap-0.5">
                        <button onClick={() => setModalDep(d)} aria-label={t.editarAria} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-black/[0.06]"><Pencil size={13} /></button>
                        <button onClick={() => { if (confirm(`${t.apagarDepPre} "${d.nome}"${t.apagarDepPos}`)) api.apagarDepartamento(d.id).then(() => { if (depSel === d.id) setDepSel(null); carregarDeps(); }); }}
                          aria-label={t.apagarAria} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Projetos do departamento */}
        <section className="lg:col-span-8">
          {!depAtual ? (
            <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
              {t.selecioneDep}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">{t.projetosPre}{depAtual.nome}</div>
                <button onClick={() => setModalProj("novo")} disabled={depAtual.agente_ids.length === 0}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
                  <Plus size={13} /> {t.novoProjeto}
                </button>
              </div>
              {projetos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
                  {depAtual.agente_ids.length === 0 ? t.addAgentesDep : t.nenhumProjeto}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {projetos.map((p) => (
                    <div key={p.id} className="rounded-xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => abrirProjeto(p.id)} className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <FolderKanban size={15} className="shrink-0 text-brand" />
                            <span className="truncate font-semibold">{p.nome}</span>
                          </div>
                          {p.descricao && <div className="mt-1 line-clamp-2 text-xs text-black/50">{p.descricao}</div>}
                        </button>
                        <div className="flex shrink-0 gap-0.5">
                          <button onClick={() => setModalProj(p)} aria-label={t.editarAria} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-black/[0.06]"><Pencil size={13} /></button>
                          <button onClick={() => { if (confirm(`${t.apagarProjPre} "${p.nome}"?`)) api.apagarProjeto(p.id).then(() => api.projetos(depAtual.id).then(setProjetos)); }}
                            aria-label={t.apagarAria} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.agente_ids.map((id) => (
                          <span key={id} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/55">{agLabel(id)}</span>
                        ))}
                      </div>
                      <button onClick={() => abrirProjeto(p.id)}
                        className="mt-3 w-full rounded-lg border border-black/15 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.03]">
                        {t.abrirProjeto}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {modalDep && (
        <ModalKit titulo={modalDep === "novo" ? t.modalNovoDep : t.modalEditDep}
          nomeInicial={modalDep === "novo" ? "" : modalDep.nome}
          idsIniciais={modalDep === "novo" ? [] : modalDep.agente_ids}
          opcoes={ativos}
          onClose={() => setModalDep(null)}
          onSalvar={async (nome, ids) => {
            if (modalDep === "novo") await api.criarDepartamento(nome, ids);
            else await api.atualizarDepartamento(modalDep.id, { nome, agente_ids: ids });
            setModalDep(null); carregarDeps();
          }}
        />
      )}

      {modalProj && depAtual && (
        <ModalProjeto
          projeto={modalProj === "novo" ? null : modalProj}
          opcoes={depAtual.agente_ids}
          onClose={() => setModalProj(null)}
          onSalvar={async (nome, descricao, ids) => {
            if (modalProj === "novo") await api.criarProjeto({ departamento_id: depAtual.id, nome, descricao, agente_ids: ids });
            else await api.atualizarProjeto(modalProj.id, { nome, descricao, agente_ids: ids });
            setModalProj(null);
            api.projetos(depAtual.id).then(setProjetos);
          }}
        />
      )}
    </div>
  );
}

/* Modal genérico: nome + seleção de agentes (dentre `opcoes`) */
function ModalKit({ titulo, nomeInicial, idsIniciais, opcoes, onClose, onSalvar }: {
  titulo: string; nomeInicial: string; idsIniciais: string[]; opcoes: string[];
  onClose: () => void; onSalvar: (nome: string, ids: string[]) => Promise<void>;
}) {
  const t = useT().gestao;
  const c = useT().common;
  const [nome, setNome] = useState(nomeInicial);
  const [ids, setIds] = useState<string[]>(idsIniciais);
  const [salvando, setSalvando] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
        <label className="mb-1 block text-xs font-medium text-black/55">{t.nome}</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t.nomePhDep}
          className="mb-4 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <label className="mb-2 block text-xs font-medium text-black/55">{t.agentesDep}</label>
        <AgentePicker opcoes={opcoes} ids={ids} onChange={setIds} />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">{c.cancelar}</button>
          <button onClick={async () => { if (!nome.trim()) return; setSalvando(true); try { await onSalvar(nome.trim(), ids); } finally { setSalvando(false); } }}
            disabled={salvando || !nome.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">{salvando ? c.salvando : c.salvar}</button>
        </div>
      </div>
    </div>
  );
}

function ModalProjeto({ projeto, opcoes, onClose, onSalvar }: {
  projeto: Projeto | null; opcoes: string[];
  onClose: () => void; onSalvar: (nome: string, descricao: string, ids: string[]) => Promise<void>;
}) {
  const t = useT().gestao;
  const c = useT().common;
  const [nome, setNome] = useState(projeto?.nome ?? "");
  const [descricao, setDescricao] = useState(projeto?.descricao ?? "");
  const [ids, setIds] = useState<string[]>(projeto?.agente_ids ?? []);
  const [salvando, setSalvando] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{projeto ? t.modalEditProj : t.modalNovoProj}</h2>
        <label className="mb-1 block text-xs font-medium text-black/55">{t.nome}</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t.nomePhProj}
          className="mb-3 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <label className="mb-1 block text-xs font-medium text-black/55">{t.descricaoOpcional}</label>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}
          className="mb-4 w-full resize-none rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <label className="mb-2 block text-xs font-medium text-black/55">{t.agentesProj}</label>
        <AgentePicker opcoes={opcoes} ids={ids} onChange={setIds} />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">{c.cancelar}</button>
          <button onClick={async () => { if (!nome.trim()) return; setSalvando(true); try { await onSalvar(nome.trim(), descricao.trim(), ids); } finally { setSalvando(false); } }}
            disabled={salvando || !nome.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">{salvando ? c.salvando : c.salvar}</button>
        </div>
      </div>
    </div>
  );
}

function AgentePicker({ opcoes, ids, onChange }: { opcoes: string[]; ids: string[]; onChange: (ids: string[]) => void }) {
  const t = useT().gestao;
  const agLabel = useAgLabel();
  if (opcoes.length === 0) return <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">{t.nenhumDisponivel}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((id) => {
        const info = agenteInfo(id);
        const on = ids.includes(id);
        const Ico = info?.icon;
        return (
          <button key={id} type="button"
            onClick={() => onChange(on ? ids.filter((x) => x !== id) : [...ids, id])}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              on ? "border-brand bg-brand text-white" : "border-black/15 text-black/60 hover:bg-black/5"
            }`}>
            {Ico && <Ico size={13} className={on ? "text-white" : info?.cor} />} {agLabel(id)}
          </button>
        );
      })}
    </div>
  );
}
