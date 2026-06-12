"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type SuporteMensagem } from "@/lib/api";

export default function SuportePage() {
  const [msgs, setMsgs] = useState<SuporteMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [carregou, setCarregou] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(() => {
    api.suporte().then((m) => { setMsgs(m); setCarregou(true); }).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 5000); // poll
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      const nova = await api.enviarSuporte(t);
      setMsgs((l) => [...l, nova]);
      setTexto("");
    } catch {
      /* mantém o texto para reenviar */
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-0px)] max-w-2xl flex-col p-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold">Suporte</h1>
        <p className="text-sm text-black/50">
          Fale direto com a nossa equipe. Respondemos por aqui — fique de olho nesta tela.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {carregou && msgs.length === 0 && (
            <div className="grid h-full place-items-center text-center text-sm text-black/40">
              <div>
                👋 Tem alguma dúvida? Escreva abaixo — a nossa equipe responde aqui mesmo.
              </div>
            </div>
          )}
          {msgs.map((m) => {
            const meu = m.autor === "cliente";
            return (
              <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    meu
                      ? "rounded-br-sm bg-brand text-white"
                      : "rounded-bl-sm border border-black/10 bg-paper text-black/80"
                  }`}
                >
                  {!meu && <div className="mb-0.5 text-[11px] font-semibold text-brand">Suporte TeamAgents</div>}
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

        <form onSubmit={enviar} className="flex items-end gap-2 border-t border-black/10 p-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e as unknown as React.FormEvent); }
            }}
            placeholder="Escreva a sua dúvida…"
            rows={1}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {enviando ? "…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
