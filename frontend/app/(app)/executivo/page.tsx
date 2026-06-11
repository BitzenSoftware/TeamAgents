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

const FUSOS: { v: string; l: string }[] = [
  { v: "America/Sao_Paulo", l: "Brasília (BRT)" },
  { v: "America/Manaus", l: "Manaus (AMT)" },
  { v: "America/Rio_Branco", l: "Acre (ACT)" },
  { v: "Europe/Lisbon", l: "Lisboa (WET)" },
  { v: "UTC", l: "UTC" },
];

const FREQ_LABEL: Record<Frequencia, string> = {
  diaria: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
};

// Opções do select de Frequência: "Manual" (único — só ao sincronizar) + as
// automáticas por período. No manual o período é irrelevante, por isso não se repete.
const FREQ_OPCOES: { v: string; l: string }[] = [
  { v: "manual", l: "Manual" },
  ...(["diaria", "semanal", "quinzenal", "mensal", "trimestral", "semestral"] as Frequencia[]).map((f) => ({
    v: `${f}|auto`,
    l: `${FREQ_LABEL[f]} (Automática)`,
  })),
];

function freqResumo(t: TarefaExecutivo): string {
  if (!t.automatica) return "manual";
  const base = (FREQ_LABEL[t.frequencia] ?? "Diária").toLowerCase();
  let quando = "";
  if (t.frequencia === "semanal" || t.frequencia === "quinzenal") quando = ` · ${DIAS_SEMANA[t.dia_semana ?? 0]?.slice(0, 3)}`;
  else if (t.frequencia === "mensal" || t.frequencia === "trimestral" || t.frequencia === "semestral") quando = ` · dia ${t.dia_mes ?? 1}`;
  return `${base} auto${quando} · ${String(t.hora ?? 7).padStart(2, "0")}h`;
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
  const [apagandoTodos, setApagandoTodos] = useState(false);
  const [tarefas, setTarefas] = useState<TarefaExecutivo[]>([]);
  const [tarefaSel, setTarefaSel] = useState<string | null>(null);
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
        setEmailMsg({ ok: false, text: "Crie pelo menos uma tarefa ativa para o agente saber o que ler." });
      } else if (res.n_emails === 0) {
        setEmailMsg({ ok: true, text: "Nenhum email novo correspondeu às suas tarefas." });
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

  // Mantém a seleção de resultado válida (não auto-abre detalhe; começa na lista).
  useEffect(() => {
    if (selId && !lista.some((p) => p.id === selId)) setSelId(null);
  }, [lista, selId]);

  // Auto-seleciona a primeira tarefa (master) quando a seleção é inválida.
  useEffect(() => {
    if (tarefas.length === 0) return;
    if (tarefaSel === "__avulsos__") return;
    if (tarefaSel === null || !tarefas.some((t) => t.id === tarefaSel)) setTarefaSel(tarefas[0].id);
  }, [tarefas, tarefaSel]);

  const selecionado = lista.find((p) => p.id === selId) ?? null;

  async function apagar(p: Processamento) {
    if (!window.confirm(`Apagar o processamento "${p.titulo}"?`)) return;
    await api.apagarProcessamento(p.id);
    setSelId(null);
    carregar();
  }

  async function apagarTodos() {
    if (!window.confirm(`Apagar TODOS os ${lista.length} resultados? Esta ação não pode ser desfeita.`)) return;
    setApagandoTodos(true);
    setErro(null);
    try {
      await api.apagarTodosProcessamentos();
      setSelId(null);
      await new Promise<void>((r) => {
        api.processamentos().then(setLista).catch(() => {}).finally(() => r());
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível apagar os resultados.");
    } finally {
      setApagandoTodos(false);
    }
  }

  // Resultados ligados à tarefa por ID (fallback ao título só para registos antigos sem tarefa_id).
  const nomesTarefas = new Set(tarefas.map((t) => t.nome));
  const idsTarefas = new Set(tarefas.map((t) => t.id));
  const pertenceA = (p: Processamento, t: TarefaExecutivo) =>
    p.tarefa_id ? p.tarefa_id === t.id : p.titulo === t.nome;
  const avulsos = lista.filter((p) => (p.tarefa_id ? !idsTarefas.has(p.tarefa_id) : !nomesTarefas.has(p.titulo)));
  const tarefaAtual = tarefaSel && tarefaSel !== "__avulsos__" ? tarefas.find((t) => t.id === tarefaSel) ?? null : null;
  const resultadosTarefa =
    tarefaSel === "__avulsos__" ? avulsos : tarefaAtual ? lista.filter((p) => pertenceA(p, tarefaAtual)) : [];
  const nomeSelecionado = tarefaSel === "__avulsos__" ? "Avulsos / colados" : tarefaAtual?.nome ?? "";
  const verDetalhe = !!selecionado && resultadosTarefa.some((p) => p.id === selId);

  return (
    <div className="p-6">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Agente Executivo</h1>
            <p className="mt-1 text-sm text-black/50">
              Defina <strong>tarefas</strong> (ex.: ler os emails do João e resumir) — o agente lê só o
              que você pede, economiza tokens e entrega prioridades, ações e decisões. Você também pode colar uma ata.
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
            <span className="font-medium">Gmail conectado:</span> <span className="text-black/60">{gmail.email}</span>
            {gmail.last_sync && (
              <span className="ml-2 text-xs text-black/40">
                · última sync {new Date(gmail.last_sync).toLocaleString("pt-BR")}
              </span>
            )}
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-black/55">Conecte a sua conta de Gmail para as tarefas poderem ler os emails.</span>
            <Link href="/configuracoes" className="rounded-lg border border-black/15 px-4 py-2 font-medium hover:bg-black/5">
              Ligar Gmail em Configurações →
            </Link>
          </div>
        )}
      </div>

      {/* Progresso da sincronização + mensagens (largura total) */}
      <FluxoAgentes ativo={syncing} />
      {emailMsg && (
        <div className={`mb-4 flex items-start justify-between rounded-lg border p-2.5 text-sm ${emailMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <span>{emailMsg.ok ? "✓ " : "✗ "}{emailMsg.text}</span>
          <button type="button" onClick={() => setEmailMsg(null)} className="ml-3 text-black/30 hover:text-black/60">×</button>
        </div>
      )}
      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {/* Master-detail: tarefas (esquerda) → resultados da tarefa (direita) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* MASTER — tarefas */}
        <aside className="md:col-span-5 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-black/50">Tarefas {tarefas.length > 0 && `(${tarefas.length})`}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => (tarefas.length > 0 ? setSyncPicker(true) : sincronizar())}
                disabled={syncing || !gmail}
                title={gmail ? "Sincronizar tarefas" : "Liga o Gmail primeiro"}
                className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {syncing ? "Sincronizando…" : "Sincronizar"}
              </button>
              <button
                type="button"
                onClick={() => setTarefaModal("nova")}
                className="rounded-md border border-black/15 px-2.5 py-1 text-[11px] font-medium hover:bg-black/5"
              >
                + Nova
              </button>
            </div>
          </div>

          {tarefas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-sm text-black/40">
              Sem tarefas. Clica em <strong>+ Nova</strong> — ex.: <em>“ler emails de joao@cliente.com”</em>.
            </p>
          ) : (
            <div className="space-y-1.5">
              {tarefas.map((t) => {
                const sel = tarefaSel === t.id;
                const n = lista.filter((p) => pertenceA(p, t)).length;
                return (
                  <div key={t.id} className={`overflow-hidden rounded-lg border ${sel ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white"} ${t.ativo ? "" : "opacity-60"}`}>
                    <button
                      type="button"
                      onClick={() => { setTarefaSel(t.id); setSelId(null); }}
                      className="block w-full px-3 py-2.5 text-left hover:bg-black/[0.02]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`break-words text-sm ${sel ? "font-semibold text-brand" : "font-medium"}`}>{t.nome}</span>
                        <span className="shrink-0 text-[10px] text-black/40">{n} result.</span>
                      </div>
                      <div className="mt-0.5 break-words text-[11px] text-black/45">
                        {t.remetente ? `de: ${t.remetente}` : "qualquer remetente"}
                        {t.palavras_chave && ` · "${t.palavras_chave}"`}
                        {` · últimos ${t.janela_dias}d · ${freqResumo(t)}`}
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 border-t border-black/5 px-3 py-1.5">
                      <button type="button" onClick={() => toggleTarefa(t)} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.ativo ? "bg-emerald-100 text-emerald-700" : "bg-black/10 text-black/50"}`}>
                        {t.ativo ? "Ativa" : "Inativa"}
                      </button>
                      <button type="button" onClick={() => setTarefaModal(t)} className="ml-auto rounded-md border border-black/15 px-2 py-0.5 text-[11px] hover:bg-black/5">Editar</button>
                      <button type="button" onClick={() => apagarTarefa(t)} className="rounded-md border border-rose-200 px-2 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50">Apagar</button>
                    </div>
                  </div>
                );
              })}

              {avulsos.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setTarefaSel("__avulsos__"); setSelId(null); }}
                  className={`block w-full rounded-lg border px-3 py-2.5 text-left transition ${tarefaSel === "__avulsos__" ? "border-brand/40 bg-brand/10" : "border-dashed border-black/15 bg-white hover:bg-black/[0.03]"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${tarefaSel === "__avulsos__" ? "font-semibold text-brand" : "font-medium"}`}>Avulsos / colados</span>
                    <span className="shrink-0 text-[10px] text-black/40">{avulsos.length} result.</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-black/45">Resultados sem tarefa (ex.: “Processar email / ata”).</div>
                </button>
              )}
            </div>
          )}
        </aside>

        {/* DETALHE — resultados da tarefa selecionada */}
        <section className="md:col-span-7 lg:col-span-8">
          {tarefaSel === null ? (
            <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
              Seleciona uma tarefa à esquerda para ver os seus resultados.
            </div>
          ) : verDetalhe && selecionado ? (
            <div>
              <button
                type="button"
                onClick={() => setSelId(null)}
                className="mb-2 inline-flex items-center gap-1 rounded-md border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5"
              >
                ← Resultados de {nomeSelecionado}
              </button>
              <Detalhe p={selecionado} onApagar={() => apagar(selecionado)} />
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-black/50">
                  Resultados de <strong className="text-ink">{nomeSelecionado}</strong> {resultadosTarefa.length > 0 && `(${resultadosTarefa.length})`}
                </span>
                {lista.length > 0 && (
                  <button
                    type="button"
                    onClick={apagarTodos}
                    disabled={apagandoTodos}
                    className="flex items-center gap-1.5 rounded-md border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    title="Apagar TODOS os resultados (de todas as tarefas)"
                  >
                    {apagandoTodos && <span className="ta-spin h-3 w-3 rounded-full border-2 border-rose-300 border-t-rose-600" />}
                    {apagandoTodos ? "Apagando…" : "Apagar todos"}
                  </button>
                )}
              </div>
              {apagandoTodos && (
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div className="ta-prog2 h-full w-1/3 rounded-full bg-rose-500" />
                </div>
              )}
              {loading ? (
                <p className="text-sm text-black/40">Carregando…</p>
              ) : resultadosTarefa.length === 0 ? (
                <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/40">
                  Sem resultados para esta tarefa ainda.
                  {tarefaSel !== "__avulsos__" && " Clica em “Sincronizar” para o agente ler e resumir."}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {resultadosTarefa.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelId(p.id)}
                      className="flex flex-col items-start gap-0.5 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-left text-sm transition hover:border-brand/40 hover:bg-brand/5"
                    >
                      <span className="break-words font-medium">{p.titulo}</span>
                      <span className="text-[11px] text-black/40">
                        {p.n_itens} item(ns){p.n_falhas > 0 && ` · ${p.n_falhas} falha(s)`} ·{" "}
                        {new Date(p.created_at).toLocaleString("pt-BR")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

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

      <style>{`@keyframes ta-spin{to{transform:rotate(360deg)}}.ta-spin{animation:ta-spin .7s linear infinite}@keyframes ta-prog2{0%{transform:translateX(-120%)}100%{transform:translateX(360%)}}.ta-prog2{animation:ta-prog2 1.1s ease-in-out infinite}`}</style>
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
  const [sel, setSel] = useState<string[]>(ativasIds); // por padrão, as ativas já vêm marcadas
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
            <span className="text-xs font-medium text-black/50">Marque as que quer rodar</span>
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
  const [hora, setHora] = useState<number>(tarefa?.hora ?? 7);
  const [fuso, setFuso] = useState<string>(tarefa?.fuso ?? "America/Sao_Paulo");
  const [instrucoes, setInstrucoes] = useState(tarefa?.instrucoes ?? "");
  const [habIds, setHabIds] = useState<string[]>(tarefa?.habilidade_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<"filtro" | "agendamento" | "ia">("filtro");

  function toggleHab(id: string) {
    setHabIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setErro(null);
    const usaDiaSemana = automatica && (frequencia === "semanal" || frequencia === "quinzenal");
    const usaDiaMes = automatica && (frequencia === "mensal" || frequencia === "trimestral" || frequencia === "semestral");
    const body = {
      nome: nome.trim(),
      remetente: remetente.trim() || undefined,
      palavras_chave: palavras.trim() || undefined,
      janela_dias: janela,
      frequencia,
      automatica,
      dia_semana: usaDiaSemana ? diaSemana : null,
      dia_mes: usaDiaMes ? diaMes : null,
      hora,
      fuso,
      instrucoes: instrucoes.trim() || undefined,
      habilidade_ids: habIds,
    };
    try {
      if (tarefa) await api.atualizarTarefaExecutivo(tarefa.id, body);
      else await api.criarTarefaExecutivo(body);
      onSaved();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
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
          {/* Nome — sempre visível (identidade + obrigatório) */}
          <Campo label="Nome da tarefa">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="campoexec" placeholder="Ex: Resumo diário do João" />
          </Campo>

          {/* Abas */}
          <div className="flex gap-1 rounded-lg border border-black/10 bg-black/[0.02] p-1">
            {([
              { id: "filtro", label: "Filtro" },
              { id: "agendamento", label: "Agendamento" },
              { id: "ia", label: "Inteligência" },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAba(t.id)}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  aba === t.id ? "bg-brand text-white" : "text-black/55 hover:bg-black/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Aba: Filtro — o que ler */}
          {aba === "filtro" && (
            <div className="space-y-3">
              <Campo label="Remetente(s) — opcional (separa por vírgula)">
                <input value={remetente} onChange={(e) => setRemetente(e.target.value)} className="campoexec" placeholder="joao@cliente.com, equipe@empresa.com" />
              </Campo>
              <Campo label="Palavras-chave — opcional (assunto/corpo)">
                <input value={palavras} onChange={(e) => setPalavras(e.target.value)} className="campoexec" placeholder="proposta, contrato" />
              </Campo>
              <Campo label="Janela (dias) — quão recentes os emails a buscar (1–180)">
                <input type="number" min={1} max={180} value={janela} onChange={(e) => setJanela(Number(e.target.value))} className="campoexec" aria-label="Janela em dias" placeholder="1" />
              </Campo>
            </div>
          )}

          {/* Aba: Agendamento — quando rodar */}
          {aba === "agendamento" && (
            <div className="space-y-3">
              <Campo label="Frequência">
                <select
                  value={automatica ? `${frequencia}|auto` : "manual"}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "manual") {
                      setAutomatica(false);
                      setFrequencia("diaria");
                    } else {
                      setFrequencia(v.split("|")[0] as Frequencia);
                      setAutomatica(true);
                    }
                  }}
                  className="campoexec"
                  aria-label="Frequência"
                >
                  {FREQ_OPCOES.map((o) => (
                    <option key={o.v} value={o.v}>{o.l}</option>
                  ))}
                </select>
              </Campo>
              {automatica && (frequencia === "semanal" || frequencia === "quinzenal") && (
                <Campo label="Dia da semana">
                  <select value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))} className="campoexec" aria-label="Dia da semana">
                    {DIAS_SEMANA.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                </Campo>
              )}
              {automatica && (frequencia === "mensal" || frequencia === "trimestral" || frequencia === "semestral") && (
                <Campo label="Dia do mês (1–31)">
                  <input type="number" min={1} max={31} value={diaMes} onChange={(e) => setDiaMes(Number(e.target.value))} className="campoexec" aria-label="Dia do mês" placeholder="10" />
                </Campo>
              )}
              {automatica && (
                <div className="flex gap-3">
                  <Campo label="Hora">
                    <select value={hora} onChange={(e) => setHora(Number(e.target.value))} className="campoexec" aria-label="Hora">
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Fuso horário">
                    <select value={fuso} onChange={(e) => setFuso(e.target.value)} className="campoexec" aria-label="Fuso horário">
                      {FUSOS.map((f) => (
                        <option key={f.v} value={f.v}>{f.l}</option>
                      ))}
                    </select>
                  </Campo>
                </div>
              )}
              <p className="rounded-lg bg-black/[0.03] p-2.5 text-[11px] text-black/50">
                {automatica ? (
                  <>
                    ⚙️ <strong>Automática</strong> — o sistema roda esta tarefa sozinho.{" "}
                    {frequencia === "diaria" && "Todos os dias"}
                    {(frequencia === "semanal" || frequencia === "quinzenal") && `Em cada ${DIAS_SEMANA[diaSemana]?.toLowerCase()}${frequencia === "quinzenal" ? " (de 15 em 15 dias)" : ""}`}
                    {(frequencia === "mensal" || frequencia === "trimestral" || frequencia === "semestral") && `No dia ${diaMes}, a cada ${frequencia === "mensal" ? "mês" : frequencia === "trimestral" ? "trimestre" : "semestre"}`}
                    {` às ${String(hora).padStart(2, "0")}:00 (${FUSOS.find((f) => f.v === fuso)?.l ?? fuso}).`}
                  </>
                ) : (
                  <>✋ <strong>Manual</strong> — só roda quando você clica em <em>Sincronizar</em>.</>
                )}
              </p>
            </div>
          )}

          {/* Aba: Inteligência — como a IA resume */}
          {aba === "ia" && (
            <div className="space-y-3">
              <Campo label="O que extrair destes emails — opcional">
                <textarea
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  className="campoexec h-24 resize-none"
                  placeholder="Ex: Foca em prazos, valores e pedidos do cliente. Ignora newsletters."
                />
              </Campo>
              <div className="block">
                <span className="mb-1 block text-xs font-medium text-black/60">Habilidades a usar — opcional</span>
                {skills.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-black/15 p-2.5 text-xs text-black/40">
                    Sem habilidades para o Agente Executivo. Crie no menu Habilidades (agente “Agente Executivo” ou “Global”).
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
            </div>
          )}

          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !nome.trim()} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {saving ? "Salvando…" : "Salvar tarefa"}
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
            placeholder="Cole aqui o email encaminhado ou a ata da reunião. Você pode colar vários de uma vez — o agente os separa."
            className="h-56 w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-black/50">
            <span className="rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5">Carregar arquivo .txt</span>
            <input type="file" accept=".txt,.md,text/plain" onChange={onFile} className="hidden" />
          </label>
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
              Cancelar
            </button>
            <button type="submit" disabled={saving || !entrada.trim()} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {saving ? "Processando…" : "Processar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
