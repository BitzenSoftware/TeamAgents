"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, PenTool, Phone, BarChart3, Bot, type LucideIcon } from "lucide-react";
import { useT } from "@/components/i18n-context";
import { agenteInfo } from "@/lib/agentes";
import { api, type AgenteSkill, type Habilidade } from "@/lib/api";

const AGENTE_VALORES: AgenteSkill[] = [
  "global", "copywriting", "sdr", "bi", "assistente", "financeiro", "juridico", "suporte",
  "produto", "rh", "auditoria", "projetos", "estrategia", "crescimento", "operacoes",
];

// Cor única por agente (nenhuma repetida entre os 15) — classes escritas por
// extenso, não montadas em runtime, porque o Tailwind só compila o CSS de
// classes que aparecem literalmente no código.
const SKILL_COR: Record<AgenteSkill, { text: string; bg: string }> = {
  global: { text: "text-brand", bg: "bg-brand/10" },
  copywriting: { text: "text-fuchsia-600", bg: "bg-fuchsia-50" },
  sdr: { text: "text-orange-600", bg: "bg-orange-50" },
  bi: { text: "text-purple-600", bg: "bg-purple-50" },
  assistente: { text: "text-pink-600", bg: "bg-pink-50" },
  financeiro: { text: "text-emerald-600", bg: "bg-emerald-50" },
  juridico: { text: "text-blue-600", bg: "bg-blue-50" },
  suporte: { text: "text-sky-600", bg: "bg-sky-50" },
  produto: { text: "text-amber-600", bg: "bg-amber-50" },
  rh: { text: "text-rose-600", bg: "bg-rose-50" },
  auditoria: { text: "text-teal-600", bg: "bg-teal-50" },
  projetos: { text: "text-cyan-600", bg: "bg-cyan-50" },
  estrategia: { text: "text-violet-600", bg: "bg-violet-50" },
  crescimento: { text: "text-lime-600", bg: "bg-lime-50" },
  operacoes: { text: "text-slate-600", bg: "bg-slate-50" },
};

const SKILL_ICON: Record<AgenteSkill, LucideIcon> = {
  global: Sparkles,
  copywriting: PenTool,
  sdr: Phone,
  bi: BarChart3,
  assistente: Bot,
  financeiro: agenteInfo("financeiro")!.icon,
  juridico: agenteInfo("juridico")!.icon,
  suporte: agenteInfo("suporte")!.icon,
  produto: agenteInfo("produto")!.icon,
  rh: agenteInfo("rh")!.icon,
  auditoria: agenteInfo("auditoria")!.icon,
  projetos: agenteInfo("projetos")!.icon,
  estrategia: agenteInfo("estrategia")!.icon,
  crescimento: agenteInfo("crescimento")!.icon,
  operacoes: agenteInfo("operacoes")!.icon,
};

function skillVisual(agente: AgenteSkill): { Icon: LucideIcon; text: string; bg: string } {
  const cor = SKILL_COR[agente];
  return { Icon: SKILL_ICON[agente], text: cor.text, bg: cor.bg };
}

export default function HabilidadesPage() {
  const t = useT().habilidades;
  const AGENTE_LABEL = t.agentes;
  const [lista, setLista] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modelosAberto, setModelosAberto] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<AgenteSkill | "todos">("todos");
  const [semCreditos, setSemCreditos] = useState(false);

  useEffect(() => {
    api.consumo()
      .then((c) => setSemCreditos(!c.ilimitado && (c.total ?? 0) === 0 && (c.creditos_avulsos ?? 0) === 0))
      .catch(() => {});
  }, []);

  const listaFiltrada = useMemo(
    () => (filtro === "todos" ? lista : lista.filter((h) => h.agente === filtro)),
    [lista, filtro],
  );

  const carregar = useCallback(() => {
    setLoading(true);
    api
      .habilidades()
      .then(setLista)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Garante uma seleção válida dentro do filtro (auto-seleciona a primeira).
  useEffect(() => {
    if (listaFiltrada.length === 0) {
      setSelId(null);
    } else if (!listaFiltrada.some((h) => h.id === selId)) {
      setSelId(listaFiltrada[0].id);
    }
  }, [listaFiltrada, selId]);

  const selecionada = listaFiltrada.find((h) => h.id === selId) ?? null;

  async function toggle(h: Habilidade) {
    await api.atualizarHabilidade(h.id, { ativo: !h.ativo });
    carregar();
  }

  async function apagar(h: Habilidade) {
    if (!window.confirm(`${t.apagarConfirm} "${h.titulo}"?`)) return;
    await api.apagarHabilidade(h.id);
    setSelId(null);
    carregar();
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setModelosAberto(true)}
              disabled={semCreditos}
              title={semCreditos ? t.semCreditosTitle : undefined}
              className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.modelosBtn}
            </button>
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              disabled={semCreditos}
              title={semCreditos ? t.semCreditosTitle : undefined}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.adicionarBtn}
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-black/50">
          {t.subtitulo}
        </p>
        {/* Filtro por agente */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["todos", "global", "copywriting", "sdr", "bi", "assistente", "financeiro", "juridico", "suporte", "produto", "rh", "auditoria", "projetos", "estrategia", "crescimento", "operacoes"] as (AgenteSkill | "todos")[]).map(
            (v) => {
              const ativo = filtro === v;
              const label = v === "todos" ? t.todos : AGENTE_LABEL[v];
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFiltro(v)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    ativo ? "bg-brand text-white" : "bg-black/5 text-black/60 hover:bg-black/10"
                  }`}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {!loading && lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          {t.vazioPre}<strong>{t.vazioStrong}</strong>{t.vazioPos}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Lista (master) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="mb-2 text-xs font-medium text-black/50">
              {filtro === "todos" ? t.salvas : AGENTE_LABEL[filtro]}{" "}
              {listaFiltrada.length > 0 && `(${listaFiltrada.length})`}
            </div>
            {loading ? (
              <p className="text-sm text-black/40">{t.carregando}</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
                {t.nenhumaNesteAgente}
              </p>
            ) : (
              <div className="space-y-1.5">
                {listaFiltrada.map((h) => {
                  const sel = h.id === selId;
                  const { Icon, text, bg } = skillVisual(h.agente);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelId(h.id)}
                      className={`flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        sel
                          ? "border-brand/40 bg-brand/10"
                          : "border-black/10 bg-white hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block break-words ${sel ? "font-semibold text-brand" : "font-medium"}`}>
                          {h.titulo}
                        </span>
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${bg} ${text}`}>
                          <Icon size={11} />
                          {AGENTE_LABEL[h.agente]}
                        </span>
                      </span>
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${h.ativo ? "bg-emerald-500" : "bg-black/20"}`}
                        title={h.ativo ? t.ativa : t.inativa}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Detalhe (detail) */}
          <section className="md:col-span-8 lg:col-span-9">
            {selecionada ? (
              <Detalhe key={selecionada.id} h={selecionada} onToggle={() => toggle(selecionada)} onApagar={() => apagar(selecionada)} onSaved={carregar} />
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
                {t.selecioneParaVer}
              </div>
            )}
          </section>
        </div>
      )}

      {modalAberto && (
        <ModalAdicionar
          defaultAgente={filtro === "todos" ? "global" : filtro}
          onClose={() => setModalAberto(false)}
          onSaved={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}

      {modelosAberto && (
        <ModalModelos
          existentes={lista.map((h) => h.titulo)}
          onClose={() => setModelosAberto(false)}
          onChanged={carregar}
        />
      )}
    </div>
  );
}

/* ---------------- Painel de detalhe ---------------- */
function Detalhe({
  h,
  onToggle,
  onApagar,
  onSaved,
}: {
  h: Habilidade;
  onToggle: () => void;
  onApagar: () => void;
  onSaved: () => void;
}) {
  const t = useT().habilidades;
  const c = useT().common;
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(h.titulo);
  const [conteudo, setConteudo] = useState(h.conteudo);
  const [agente, setAgente] = useState<AgenteSkill>(h.agente);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function cancelar() {
    setTitulo(h.titulo);
    setConteudo(h.conteudo);
    setAgente(h.agente);
    setErro(null);
    setEditando(false);
  }

  async function salvar() {
    if (!titulo.trim() || !conteudo.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      await api.atualizarHabilidade(h.id, { titulo: titulo.trim(), conteudo: conteudo.trim(), agente });
      setEditando(false);
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
        <div className="min-w-0">
          <h2 className="min-w-0 break-words text-base font-semibold text-white">{editando ? t.editandoTitulo : h.titulo}</h2>
          <div className="mt-0.5 text-[11px] text-white/70">{t.agentes[h.agente]}</div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            h.ativo ? "bg-white/20 text-white" : "bg-black/20 text-white/80"
          }`}
        >
          {h.ativo ? t.ativa : t.inativa}
        </span>
      </div>
      <div className="p-5">
        {editando ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-black/50">{t.agente}</span>
              <select
                value={agente}
                onChange={(e) => setAgente(e.target.value as AgenteSkill)}
                className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
              >
                {AGENTE_VALORES.map((v) => (
                  <option key={v} value={v}>{t.agentes[v]}</option>
                ))}
              </select>
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={t.tituloPh}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder={t.conteudoPh}
              className="h-72 w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm leading-relaxed"
            />
            {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
            <div className="flex gap-2 border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={salvar}
                disabled={saving || !titulo.trim() || !conteudo.trim()}
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {saving ? c.salvando : c.salvar}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={saving}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40"
              >
                {c.cancelar}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-black/80">{h.conteudo}</p>
            <div className="mt-5 flex gap-2 border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                {t.editar}
              </button>
              <button
                type="button"
                onClick={onToggle}
                className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
              >
                {h.ativo ? t.desativar : t.ativar}
              </button>
              <button
                type="button"
                onClick={onApagar}
                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
              >
                {t.apagar}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Modal de criação ---------------- */
function ModalAdicionar({
  defaultAgente,
  onClose,
  onSaved,
}: {
  defaultAgente: AgenteSkill;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT().habilidades;
  const c = useT().common;
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [agente, setAgente] = useState<AgenteSkill>(defaultAgente);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      await api.criarHabilidade(titulo.trim(), conteudo.trim(), agente);
      onSaved();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t.erroSalvar);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">{t.modalNovaTitulo}</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            ×
          </button>
        </div>
        <form onSubmit={adicionar} className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/50">{t.agente}</span>
            <select
              value={agente}
              onChange={(e) => setAgente(e.target.value as AgenteSkill)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            >
              {AGENTE_VALORES.map((v) => (
                <option key={v} value={v}>
                  {t.agentes[v]}
                </option>
              ))}
            </select>
          </label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={t.novoTituloPh}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder={t.novoConteudoPh}
            className="h-[50vh] min-h-[16rem] w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40"
            >
              {c.cancelar}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {saving ? c.salvando : t.adicionarHabilidade}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Modelos prontos para clínicas de estética (conteúdo no dicionário) ---------------- */
type Modelo = { titulo: string; agente: string; conteudo: string };

function ModalModelos({
  existentes,
  onClose,
  onChanged,
}: {
  existentes: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const t = useT().habilidades;
  const TEMPLATES_ESTETICA = t.templates;
  const jaTem = useMemo(() => new Set(existentes.map((x) => x.toLowerCase())), [existentes]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function presente(m: Modelo) {
    return jaTem.has(m.titulo.toLowerCase()) || added.has(m.titulo);
  }

  async function adicionar(m: Modelo) {
    setBusy(m.titulo);
    setErro(null);
    try {
      await api.criarHabilidade(m.titulo, m.conteudo, m.agente as AgenteSkill);
      setAdded((s) => new Set(s).add(m.titulo));
      onChanged();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroAdicionar);
    } finally {
      setBusy(null);
    }
  }

  async function adicionarTodos() {
    for (const m of TEMPLATES_ESTETICA) {
      if (!presente(m)) await adicionar(m);
    }
  }

  const faltam = TEMPLATES_ESTETICA.filter((m) => !presente(m)).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">{t.modelosBtn}</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>
        <div className="border-b border-black/5 px-5 py-3">
          <p className="text-xs leading-relaxed text-black/55">
            {t.modelosDesc1}<strong>{t.modelosDescStrong}</strong>{t.modelosDesc2}
          </p>
        </div>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {TEMPLATES_ESTETICA.map((m) => {
            const ok = presente(m);
            return (
              <div key={m.titulo} className="rounded-xl border border-black/10 p-3.5">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{m.titulo}</span>
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/50">
                    {t.agentes[m.agente]}
                  </span>
                </div>
                <p className="mb-2.5 line-clamp-2 whitespace-pre-wrap text-xs text-black/45">{m.conteudo}</p>
                <button
                  type="button"
                  onClick={() => adicionar(m)}
                  disabled={ok || busy === m.titulo}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    ok
                      ? "cursor-default bg-emerald-50 text-emerald-700"
                      : "bg-brand text-white hover:opacity-90 disabled:opacity-40"
                  }`}
                >
                  {ok ? t.adicionada : busy === m.titulo ? t.adicionando : t.adicionar}
                </button>
              </div>
            );
          })}
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-3">
          <span className="text-xs text-black/40">{faltam > 0 ? `${faltam} ${t.porAdicionarSuf}` : t.tudoAdicionado}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
              {t.fechar}
            </button>
            <button
              type="button"
              onClick={adicionarTodos}
              disabled={faltam === 0 || busy !== null}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {t.adicionarTodos}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
