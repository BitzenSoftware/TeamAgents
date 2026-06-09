"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type AcaoItem,
  type EmailAccount,
  type Frequencia,
  type Habilidade,
  type ItemProcessado,
  type Processamento,
  type TarefaExecutivo,
} from "@/lib/api";
import { FluxoAgentes } from "@/components/FluxoAgentes";

const PRIORIDADE_COR: Record<ItemProcessado["prioridade"], string> = {
  alta: "bg-rose-100 text-rose-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-emerald-100 text-emerald-700",
};

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const FREQ_LABEL: Record<Frequencia, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
};

// Opções combinadas período × modo para o select de Frequência.
const FREQ_OPCOES: { v: string; l: string }[] = (
  ["diaria", "semanal", "quinzenal", "mensal", "trimestral", "semestral"] as Frequencia[]
).flatMap((f) => [
  { v: `${f}|auto`, l: `${FREQ_LABEL[f]} (Automática)` },
  { v: `${f}|man`, l: `${FREQ_LABEL[f]} (Manual)` },
]);

function freqResumo(t: TarefaExecutivo): string {
  const base = FREQ_LABEL[t.frequencia] ?? "Diária";
  const modo = t.automatica ? "auto" : "manual";
  let quando = "";
  if (t.automatica) {
    if (t.frequencia === "semanal" || t.frequencia === "quinzenal") quando = ` · ${DIAS_SEMANA[t.dia_semana ?? 0]?.slice(0, 3)}`;
    else if (t.frequencia === "mensal" || t.frequencia === "trimestral" || t.frequencia === "semestral") quando = ` · dia ${t.dia_mes ?? 1}`;
  }
  return `${base.toLowerCase()} ${modo}${quando}`;
}

export default function ExecutivoPage() {
  const [lista, setLista] = useState<Processamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [contas, setContas] = useState<EmailAccount[]>([]);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [tarefas, setTarefas] = useState<TarefaExecutivo[]>([]);
  const [tarefaModal, setTarefaModal] = useState<TarefaExecutivo | "nova" | null>(null);
  const [syncPicker, setSyncPicker] = useState(false);
  const [skills, setSkills] = useState<Habilidade[]>([]);

  const carregar = useCallback(() => {
    setLoading(true);
    api.processamentos().then(setLista).catch((e) => setErro(e.message)).finally(() => setLoading(false));
  }, []);
  const carregarContas = useCallback(() => {
    api.emailAccounts().then(setContas).catch(() => {});
  }, []);
  const carregarTarefas = useCallback(() => {
    api.tarefasExecutivo().then(setTarefas).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
    carregarContas();
    carregarTarefas();
    // Skills disponíveis para o Agente Executivo: as 'assistente' + as 'global', ativas.
    api
      .habilidades()
      .then((hs) => setSkills(hs.filter((h) => h.ativo && (h.agente === "assistente" || h.agente === "global"))))
      .catch(() => {});
  }, [carregar, carregarContas, carregarTarefas]);

  const gmail = contas.find((c) => c.provider === "gmail") ?? null;

  async function sincronizar(tarefaIds?: string[]) {
    setSyncing(true);
    setEmailMsg(null);
    try {
      const res = await api.sincronizarEmail("gmail", tarefaIds);
      if (res.sem_tarefas) {
        setEmailMsg({ ok: false, text: "Cria pelo menos uma tarefa ativa para o agente saber o que ler." });
      } else if (res.n_emails === 0) {
        setEmailMsg({ ok: true, text: "Nenhum email novo correspondeu às tuas tarefas." });
      } else {
        setEmailMsg({ ok: true, text: `${res.n_emails} email(s) processado(s) em ${res.processamentos.length} tarefa(s).` });
        if (res.processamentos[0]) setSelId(res.processamentos[0].id);
        carregar();
      }
      carregarContas();
      carregarTarefas();
    } catch (e) {
      setEmailMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao sincronizar." });
    } finally {
      setSyncing(false);
    }
  }

  async function toggleTarefa(t: TarefaExecutivo) {
    await api.atualizarTarefaExecutivo(t.id, { ativo: !t.ativo });
    carregarTarefas();
  }
  async function apagarTarefa(t: TarefaExecutivo) {
    if (!window.confirm(`Apagar a tarefa "${t.nome}"?`)) return;
    await api.apagarTarefaExecutivo(t.id);
    carregarTarefas();
  }

  useEffect(() => {
    if (lista.length === 0) setSelId(null);
    else if (!lista.some((p) => p.id === selId)) setSelId(lista[0].id);
  }, [lista, selId]);

  const selecionado = lista.find((p) => p.id === selId) ?? null;

  async function apagar(p: Processamento) {
    if (!window.confirm(`Apagar o processamento "${p.titulo}"?`)) return;
    await api.apagarProcessamento(p.id);
    setSelId(null);
    carregar();
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Agente Executivo</h1>
            <p className="mt-1 text-sm text-black/50">
              Define <strong>tarefas</strong> (ex.: ler os emails do João e resumir) — o agente lê só o
              que pedes, poupa tokens e entrega prioridades, ações e decisões. Também podes colar uma ata.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + Processar email / ata
          </button>
        </div>
      </header>

      {/* Gmail — estado da ligação */}
      <div className="mb-4 rounded-xl border border-black/10 bg-white p-4 text-sm">
        {gmail ? (
          <span>
            <span className="font-medium">Gmail ligado:</span> <span className="text-black/60">{gmail.email}</span>
            {gmail.last_sync && (
              <span className="ml-2 text-xs text-black/40">
                · última sync {new Date(gmail.last_sync).toLocaleString("pt-PT")}
              </span>
            )}
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-black/55">Liga a tua conta de Gmail para as tarefas poderem ler os emails.</span>
            <Link href="/configuracoes" className="rounded-lg border border-black/15 px-4 py-2 font-medium hover:bg-black/5">
              Ligar Gmail em Configurações →
            </Link>
          </div>
        )}
      </div>

      {/* Tarefas dirigidas */}
      <div className="mb-5 overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5">
          <span className="text-sm font-semibold text-white">Tarefas {tarefas.length > 0 && `(${tarefas.length})`}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (tarefas.length > 0 ? setSyncPicker(true) : sincronizar())}
              disabled={syncing || !gmail}
              title={gmail ? "Sincronizar tarefas" : "Liga o Gmail primeiro"}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30 disabled:opacity-40"
            >
              {syncing ? "A sincronizar…" : "Sincronizar agora"}
            </button>
            <button
              type="button"
              onClick={() => setTarefaModal("nova")}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-brand hover:opacity-90"
            >
              + Nova tarefa
            </button>
          </div>
        </div>

        <FluxoAgentes ativo={syncing} />

        {emailMsg && (
          <div className={`mx-4 mt-3 flex items-start justify-between rounded-lg border p-2.5 text-sm ${emailMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <span>{emailMsg.ok ? "✓ " : "✗ "}{emailMsg.text}</span>
            <button type="button" onClick={() => setEmailMsg(null)} className="ml-3 text-black/30 hover:text-black/60">×</button>
          </div>
        )}

        <div className="p-4">
          {tarefas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              Sem tarefas. Cria uma — ex.: <em>“ler emails de joao@cliente.com, últimos 1 dia”</em> — e clica
              “Sincronizar agora”.
            </p>
          ) : (
            <div className="space-y-2">
              {tarefas.map((t) => (
                <div key={t.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${t.ativo ? "border-black/10 bg-white" : "border-black/10 bg-black/[0.02] opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm font-medium">{t.nome}</div>
                    <div className="mt-0.5 break-words text-[11px] text-black/45">
                      {t.remetente ? `de: ${t.remetente}` : "qualquer remetente"}
                      {t.palavras_chave && ` · "${t.palavras_chave}"`}
                      {` · últimos ${t.janela_dias}d`}
                      {` · ${freqResumo(t)}`}
                      {t.last_run && ` · corrida ${new Date(t.last_run).toLocaleDateString("pt-PT")}`}
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleTarefa(t)} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.ativo ? "bg-emerald-100 text-emerald-700" : "bg-black/10 text-black/50"}`}>
                    {t.ativo ? "Ativa" : "Inativa"}
                  </button>
                  <button type="button" onClick={() => setTarefaModal(t)} className="rounded-lg border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5">
                    Editar
                  </button>
                  <button type="button" onClick={() => apagarTarefa(t)} className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50">
                    Apagar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {!loading && lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Ainda não há resultados. Cria uma tarefa e sincroniza, ou clica em{" "}
          <strong>“+ Processar email / ata”</strong> para colar um texto.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="mb-2 text-xs font-medium text-black/50">
              Resultados {lista.length > 0 && `(${lista.length})`}
            </div>
            {loading ? (
              <p className="text-sm text-black/40">A carregar…</p>
            ) : (
              <div className="space-y-1.5">
                {lista.map((p) => {
                  const sel = p.id === selId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelId(p.id)}
                      className={`flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${sel ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"}`}
                    >
                      <span className={`break-words ${sel ? "font-semibold text-brand" : "font-medium"}`}>{p.titulo}</span>
                      <span className="text-[11px] text-black/40">
                        {p.n_itens} item(ns){p.n_falhas > 0 && ` · ${p.n_falhas} falha(s)`} ·{" "}
                        {new Date(p.created_at).toLocaleDateString("pt-PT")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="md:col-span-8 lg:col-span-9">
            {selecionado ? (
              <Detalhe p={selecionado} onApagar={() => apagar(selecionado)} />
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
                Seleciona um resultado à esquerda.
              </div>
            )}
          </section>
        </div>
      )}

      {modalAberto && (
        <ModalProcessar
          onClose={() => setModalAberto(false)}
          onSaved={(novo) => {
            setModalAberto(false);
            setSelId(novo.id);
            carregar();
          }}
        />
      )}

      {tarefaModal && (
        <ModalTarefa
          tarefa={tarefaModal === "nova" ? null : tarefaModal}
          skills={skills}
          onClose={() => setTarefaModal(null)}
          onSaved={() => {
            setTarefaModal(null);
            carregarTarefas();
          }}
        />
      )}

      {syncPicker && (
        <ModalEscolherSync
          tarefas={tarefas}
          onClose={() => setSyncPicker(false)}
          onConfirmar={(ids) => {
            setSyncPicker(false);
            sincronizar(ids);
          }}
        />
      )}

    </div>
  );
}

/* ---------------- Lista de ações ---------------- */
function Acoes({ acoes }: { acoes: AcaoItem[] }) {
  if (acoes.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {acoes.map((a, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm text-black/80">
          <span className="text-brand">▸</span>
          <span>{a.descricao}</span>
          {a.responsavel && <span className="text-xs text-black/45">· {a.responsavel}</span>}
          {a.prazo && <span className="text-xs text-black/45">· {a.prazo}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Painel de detalhe ---------------- */
function Detalhe({ p, onApagar }: { p: Processamento; onApagar: () => void }) {
  const s = p.sintese;
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
        <h2 className="min-w-0 break-words text-base font-semibold text-white">{p.titulo}</h2>
        <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white">
          {p.n_itens} item(ns)
        </span>
      </div>
      <div className="space-y-5 p-5">
        {p.n_falhas > 0 && (
          <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
            {p.n_falhas} item(ns) não foram processados — a síntese abaixo é parcial.
          </p>
        )}

        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">Resumo geral</h3>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-black/80">{s.resumo_geral}</p>
        </section>

        {s.prioridades.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">Prioridades</h3>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-black/80">
              {s.prioridades.map((pr, i) => (
                <li key={i}>{pr}</li>
              ))}
            </ol>
          </section>
        )}

        {s.acoes_consolidadas.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">Ações</h3>
            <Acoes acoes={s.acoes_consolidadas} />
          </section>
        )}

        {s.decisoes_consolidadas.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">Decisões</h3>
            <ul className="space-y-1 text-sm text-black/80">
              {s.decisoes_consolidadas.map((d, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {p.itens.length > 0 && (
          <section className="border-t border-black/5 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/40">Itens processados</h3>
            <div className="space-y-2.5">
              {p.itens.map((it, i) => (
                <details key={i} className="rounded-lg border border-black/10 bg-black/[0.015] p-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${PRIORIDADE_COR[it.prioridade]}`}>
                      {it.prioridade}
                    </span>
                    <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] uppercase text-black/50">{it.tipo}</span>
                    <span className="min-w-0 flex-1 break-words">{it.titulo}</span>
                  </summary>
                  <div className="mt-2 space-y-2 pl-1">
                    <p className="text-sm text-black/75">{it.resumo}</p>
                    <Acoes acoes={it.acoes} />
                    {it.decisoes.length > 0 && (
                      <ul className="space-y-0.5 text-sm text-black/75">
                        {it.decisoes.map((d, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="text-emerald-600">✓</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-2 border-t border-black/5 pt-4">
          <button type="button" onClick={onApagar} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Janela: escolher o que sincronizar (multi-seleção) ---------------- */
function ModalEscolherSync({
  tarefas,
  onClose,
  onConfirmar,
}: {
  tarefas: TarefaExecutivo[];
  onClose: () => void;
  onConfirmar: (tarefaIds?: string[]) => void;
}) {
  const ativasIds = tarefas.filter((t) => t.ativo).map((t) => t.id);
  const [sel, setSel] = useState<string[]>(ativasIds); // por defeito, as ativas já vêm marcadas
  const todasAtivas = ativasIds.length > 0 && ativasIds.every((id) => sel.includes(id));

  function toggle(id: string) {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">Que tarefas sincronizar?</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>
        <div className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-black/50">Marca as que queres correr</span>
            <button
              type="button"
              onClick={() => setSel(todasAtivas ? [] : ativasIds)}
              className="text-xs font-medium text-brand hover:underline"
            >
              {todasAtivas ? "Desmarcar todas" : "Selecionar todas as ativas"}
            </button>
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {tarefas.map((t) => {
              const marcada = sel.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${marcada ? "border-brand/40 bg-brand/10" : "border-black/10 hover:bg-black/[0.03]"}`}
                >
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${marcada ? "border-brand bg-brand text-white" : "border-black/25"}`}>
                    {marcada && <span className="text-[10px] leading-none">✓</span>}
                  </span>
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{t.nome}</span>
                    {!t.ativo && <span className="ml-2 text-[11px] text-black/40">(inativa)</span>}
                    <span className="mt-0.5 block text-[11px] text-black/40">
                      {t.remetente ? `de: ${t.remetente}` : "qualquer remetente"}
                      {t.palavras_chave && ` · "${t.palavras_chave}"`} · últimos {t.janela_dias}d
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirmar(sel)}
              disabled={sel.length === 0}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Sincronizar{sel.length > 0 ? ` (${sel.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Modal: nova/editar tarefa ---------------- */
function ModalTarefa({
  tarefa,
  skills,
  onClose,
  onSaved,
}: {
  tarefa: TarefaExecutivo | null;
  skills: Habilidade[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(tarefa?.nome ?? "");
  const [remetente, setRemetente] = useState(tarefa?.remetente ?? "");
  const [palavras, setPalavras] = useState(tarefa?.palavras_chave ?? "");
  const [janela, setJanela] = useState(tarefa?.janela_dias ?? 1);
  const [frequencia, setFrequencia] = useState<Frequencia>(tarefa?.frequencia ?? "diaria");
  const [automatica, setAutomatica] = useState<boolean>(tarefa?.automatica ?? false);
  const [diaSemana, setDiaSemana] = useState<number>(tarefa?.dia_semana ?? 0);
  const [diaMes, setDiaMes] = useState<number>(tarefa?.dia_mes ?? 1);
  const [instrucoes, setInstrucoes] = useState(tarefa?.instrucoes ?? "");
  const [habIds, setHabIds] = useState<string[]>(tarefa?.habilidade_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggleHab(id: string) {
    setHabIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setErro(null);
    const usaDiaSemana = frequencia === "semanal" || frequencia === "quinzenal";
    const usaDiaMes = frequencia === "mensal" || frequencia === "trimestral" || frequencia === "semestral";
    const body = {
      nome: nome.trim(),
      remetente: remetente.trim() || undefined,
      palavras_chave: palavras.trim() || undefined,
      janela_dias: janela,
      frequencia,
      automatica,
      dia_semana: usaDiaSemana ? diaSemana : null,
      dia_mes: usaDiaMes ? diaMes : null,
      instrucoes: instrucoes.trim() || undefined,
      habilidade_ids: habIds,
    };
    try {
      if (tarefa) await api.atualizarTarefaExecutivo(tarefa.id, body);
      else await api.criarTarefaExecutivo(body);
      onSaved();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">{tarefa ? "Editar tarefa" : "Nova tarefa"}</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>
        <form onSubmit={guardar} className="space-y-3 p-5">
          <Campo label="Nome da tarefa">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="campoexec" placeholder="Ex: Resumo diário do João" />
          </Campo>
          <Campo label="Remetente(s) — opcional (separa por vírgula)">
            <input value={remetente} onChange={(e) => setRemetente(e.target.value)} className="campoexec" placeholder="joao@cliente.com, equipa@empresa.com" />
          </Campo>
          <Campo label="Palavras-chave — opcional (assunto/corpo)">
            <input value={palavras} onChange={(e) => setPalavras(e.target.value)} className="campoexec" placeholder="proposta, contrato" />
          </Campo>
          <div className="flex gap-3">
            <Campo label="Janela (dias)">
              <input type="number" min={1} max={30} value={janela} onChange={(e) => setJanela(Number(e.target.value))} className="campoexec" aria-label="Janela em dias" placeholder="1" />
            </Campo>
            <Campo label="Frequência">
              <select
                value={`${frequencia}|${automatica ? "auto" : "man"}`}
                onChange={(e) => {
                  const [f, a] = e.target.value.split("|");
                  setFrequencia(f as Frequencia);
                  setAutomatica(a === "auto");
                }}
                className="campoexec"
                aria-label="Frequência"
              >
                {FREQ_OPCOES.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </Campo>
          </div>
          {(frequencia === "semanal" || frequencia === "quinzenal") && (
            <Campo label="Dia da semana">
              <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className="campoexec" aria-label="Dia da semana">
                {DIAS_SEMANA.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Campo>
          )}
          {(frequencia === "mensal" || frequencia === "trimestral" || frequencia === "semestral") && (
            <Campo label="Dia do mês (1–31)">
              <input type="number" min={1} max={31} value={diaMes} onChange={(e) => setDiaMes(Number(e.target.value))} className="campoexec" aria-label="Dia do mês" placeholder="10" />
            </Campo>
          )}
          {automatica && (
            <p className="-mt-1 text-[11px] text-black/45">
              ⚙️ Automática: o sistema corre esta tarefa sozinho conforme a frequência.{" "}
              {frequencia === "diaria" && "Todos os dias."}
              {(frequencia === "semanal" || frequencia === "quinzenal") && `Em cada ${DIAS_SEMANA[diaSemana]?.toLowerCase()}.`}
              {(frequencia === "mensal" || frequencia === "trimestral" || frequencia === "semestral") && `No dia ${diaMes} do mês.`}
            </p>
          )}
          <Campo label="O que extrair destes emails — opcional">
            <textarea
              value={instrucoes}
              onChange={(e) => setInstrucoes(e.target.value)}
              className="campoexec h-20 resize-none"
              placeholder="Ex: Foca em prazos, valores e pedidos do cliente. Ignora newsletters."
            />
          </Campo>
          <div className="block">
            <span className="mb-1 block text-xs font-medium text-black/60">Habilidades a usar — opcional</span>
            {skills.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/15 p-2.5 text-xs text-black/40">
                Sem habilidades para o Agente Executivo. Cria no menu Habilidades (agente “Agente Executivo” ou “Global”).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((h) => {
                  const sel = habIds.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHab(h.id)}
                      title={h.conteudo}
                      className={`rounded-full border px-3 py-1 text-xs transition ${sel ? "border-brand bg-brand text-white" : "border-black/15 text-black/60 hover:bg-black/5"}`}
                    >
                      {h.titulo}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !nome.trim()} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {saving ? "A guardar…" : "Guardar tarefa"}
            </button>
          </div>
        </form>
      </div>
      <style>{`.campoexec{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff}`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

/* ---------------- Modal de processamento manual (colar/upload) ---------------- */
function ModalProcessar({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (p: Processamento) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [entrada, setEntrada] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEntrada(String(reader.result ?? ""));
    reader.readAsText(file);
    if (!titulo.trim()) setTitulo(file.name.replace(/\.[^.]+$/, ""));
  }

  async function processar(e: React.FormEvent) {
    e.preventDefault();
    if (!entrada.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      const novo = await api.processarExecutivo(entrada.trim(), titulo.trim() || undefined);
      onSaved(novo);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao processar");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">Processar email / ata</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>
        <form onSubmit={processar} className="space-y-3 p-5">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título (opcional) — ex: Reunião de produto 08/06"
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Cola aqui o email reencaminhado ou a ata da reunião. Podes colar vários de uma vez — o agente separa-os."
            className="h-56 w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-black/50">
            <span className="rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5">Carregar ficheiro .txt</span>
            <input type="file" accept=".txt,.md,text/plain" onChange={onFile} className="hidden" />
          </label>
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !entrada.trim()} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {saving ? "A processar…" : "Processar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
