"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, SUPERADMIN_EMAIL, type SuporteMensagem, type SuporteThread } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

export default function AdminSuportePage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const [threads, setThreads] = useState<SuporteThread[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<SuporteMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [debug, setDebug] = useState<string>("");
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    api.adminSuporteDebug().then((d) => setDebug(JSON.stringify(d))).catch((e) => setDebug("debug erro: " + (e instanceof Error ? e.message : String(e))));
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/pipeline");
  }, [authLoading, isAdmin, router]);

  const carregarThreads = useCallback(() => {
    if (!isAdmin) return;
    api.adminSuporteThreads()
      .then((t) => { setThreads(t); setErro(null); })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [isAdmin]);

  const carregarMsgs = useCallback(() => {
    if (!sel) return;
    api.adminSuporteMensagens(sel).then(setMsgs).catch(() => {});
  }, [sel]);

  useEffect(() => {
    carregarThreads();
    const id = setInterval(carregarThreads, 6000);
    return () => clearInterval(id);
  }, [carregarThreads]);

  useEffect(() => {
    setMsgs([]);
    carregarMsgs();
    if (!sel) return;
    const id = setInterval(carregarMsgs, 5000);
    return () => clearInterval(id);
  }, [sel, carregarMsgs]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function responder(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || !sel || enviando) return;
    setEnviando(true);
    try {
      const nova = await api.adminResponderSuporte(sel, t);
      setMsgs((l) => [...l, nova]);
      setTexto("");
      carregarThreads();
    } catch {
      /* mantém o texto */
    } finally {
      setEnviando(false);
    }
  }

  if (!authLoading && !isAdmin) return null;

  const selThread = threads.find((t) => t.cliente_id === sel) ?? null;

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Suporte — Caixa de entrada</h1>
        <p className="mt-1 text-sm text-black/50">Mensagens dos clientes. Responda direto por aqui.</p>
        {erro && (
          <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
            Erro ao carregar: {erro}
          </p>
        )}
        {debug && (
          <p className="mt-2 break-all rounded-lg bg-amber-50 p-2.5 font-mono text-[11px] text-amber-900">
            diag: {debug}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Threads */}
        <aside className="md:col-span-4 lg:col-span-3">
          <div className="mb-2 text-xs font-medium text-black/50">Conversas ({threads.length})</div>
          {threads.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
              Nenhuma mensagem ainda.
            </p>
          ) : (
            <div className="space-y-1.5">
              {threads.map((t) => {
                const ativo = t.cliente_id === sel;
                return (
                  <button
                    key={t.cliente_id}
                    type="button"
                    onClick={() => setSel(t.cliente_id)}
                    className={`block w-full rounded-lg border px-3 py-2.5 text-left transition ${
                      ativo ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`min-w-0 flex-1 truncate text-sm ${ativo ? "font-semibold text-brand" : "font-medium"}`}>
                        {t.nome || t.email || "Empresa"}
                      </span>
                      {t.nao_lidas > 0 && (
                        <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {t.nao_lidas}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-black/40">{t.ultima}</div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Conversa */}
        <section className="md:col-span-8 lg:col-span-9">
          {!selThread ? (
            <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
              Selecione uma conversa à esquerda.
            </div>
          ) : (
            <div className="flex h-[calc(100vh-220px)] flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
              <div className="border-b border-black/10 px-4 py-3">
                <div className="text-sm font-semibold">{selThread.nome || "Empresa"}</div>
                <div className="text-xs text-black/45">{selThread.email}</div>
              </div>
              <div className="flex-1 space-y-3 overflow-auto p-4">
                {msgs.map((m) => {
                  const meu = m.autor === "admin";
                  return (
                    <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          meu ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-black/10 bg-paper text-black/80"
                        }`}
                      >
                        <span className="whitespace-pre-wrap">{m.mensagem}</span>
                        <div className={`mt-1 text-[10px] ${meu ? "text-white/50" : "text-black/30"}`}>
                          {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={fimRef} />
              </div>
              <form onSubmit={responder} className="flex items-end gap-2 border-t border-black/10 p-3">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); responder(e as unknown as React.FormEvent); }
                  }}
                  placeholder="Escreva a resposta…"
                  rows={1}
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  disabled={enviando || !texto.trim()}
                  className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  {enviando ? "…" : "Responder"}
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
