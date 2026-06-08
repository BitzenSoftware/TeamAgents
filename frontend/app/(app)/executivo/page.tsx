"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type AcaoItem,
  type EmailAccount,
  type ItemProcessado,
  type Processamento,
} from "@/lib/api";

const PRIORIDADE_COR: Record<ItemProcessado["prioridade"], string> = {
  alta: "bg-rose-100 text-rose-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-emerald-100 text-emerald-700",
};

export default function ExecutivoPage() {
  const [lista, setLista] = useState<Processamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [contas, setContas] = useState<EmailAccount[]>([]);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    api
      .processamentos()
      .then(setLista)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const carregarContas = useCallback(() => {
    api.emailAccounts().then(setContas).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
    carregarContas();
  }, [carregar, carregarContas]);

  async function sincronizar() {
    setSyncing(true);
    setEmailMsg(null);
    try {
      const res = await api.sincronizarEmail("gmail");
      if (res.n_emails === 0) {
        setEmailMsg({ ok: true, text: "Sem emails novos nos últimos 7 dias." });
      } else {
        setEmailMsg({ ok: true, text: `${res.n_emails} email(s) processado(s).` });
        if (res.processamento) setSelId(res.processamento.id);
        carregar();
      }
      carregarContas();
    } catch (e) {
      setEmailMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao sincronizar." });
    } finally {
      setSyncing(false);
    }
  }

  const gmail = contas.find((c) => c.provider === "gmail") ?? null;

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
              Cola emails ou atas de reunião — mesmo vários de uma vez. O agente separa, resume e
              extrai prioridades, ações e decisões.
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

      {/* Integração de email (Fase 2) */}
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-4">
        {emailMsg && (
          <div
            className={`mb-3 flex items-start justify-between rounded-lg border p-2.5 text-sm ${
              emailMsg.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <span>
              {emailMsg.ok ? "✓ " : "✗ "}
              {emailMsg.text}
            </span>
            <button type="button" onClick={() => setEmailMsg(null)} className="ml-3 text-black/30 hover:text-black/60">
              ×
            </button>
          </div>
        )}
        {gmail ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <span className="font-medium">Gmail ligado:</span>{" "}
              <span className="text-black/60">{gmail.email}</span>
              {gmail.last_sync && (
                <span className="ml-2 text-xs text-black/40">
                  · última sync {new Date(gmail.last_sync).toLocaleString("pt-PT")}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={sincronizar}
              disabled={syncing}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {syncing ? "A sincronizar…" : "Sincronizar agora"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-black/55">
              Liga a tua conta de Gmail para o agente buscar e resumir os emails recentes.
            </p>
            <Link
              href="/configuracoes"
              className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
            >
              Ligar Gmail em Configurações →
            </Link>
          </div>
        )}
      </div>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {!loading && lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Ainda não processaste nada. Clica em <strong>“+ Processar email / ata”</strong> e cola o
          texto — o resumo executivo aparece aqui.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Lista (master) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="mb-2 text-xs font-medium text-black/50">
              Processamentos {lista.length > 0 && `(${lista.length})`}
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
                      className={`flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        sel
                          ? "border-brand/40 bg-brand/10"
                          : "border-black/10 bg-white hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className={`break-words ${sel ? "font-semibold text-brand" : "font-medium"}`}>
                        {p.titulo}
                      </span>
                      <span className="text-[11px] text-black/40">
                        {p.n_itens} item(ns)
                        {p.n_falhas > 0 && ` · ${p.n_falhas} falha(s)`} ·{" "}
                        {new Date(p.created_at).toLocaleDateString("pt-PT")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Detalhe (detail) */}
          <section className="md:col-span-8 lg:col-span-9">
            {selecionado ? (
              <Detalhe p={selecionado} onApagar={() => apagar(selecionado)} />
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
                Seleciona um processamento à esquerda.
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

        {/* Itens individuais */}
        {p.itens.length > 0 && (
          <section className="border-t border-black/5 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/40">
              Itens processados
            </h3>
            <div className="space-y-2.5">
              {p.itens.map((it, i) => (
                <details key={i} className="rounded-lg border border-black/10 bg-black/[0.015] p-3">
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${PRIORIDADE_COR[it.prioridade]}`}>
                      {it.prioridade}
                    </span>
                    <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] uppercase text-black/50">
                      {it.tipo}
                    </span>
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
          <button
            type="button"
            onClick={onApagar}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
          >
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Modal de processamento ---------------- */
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
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            ×
          </button>
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
            <span className="rounded-lg border border-black/15 px-3 py-1.5 hover:bg-black/5">
              Carregar ficheiro .txt
            </span>
            <input type="file" accept=".txt,.md,text/plain" onChange={onFile} className="hidden" />
          </label>
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !entrada.trim()}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "A processar…" : "Processar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
