"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, Scale, LifeBuoy, Package, Send, Loader2, type LucideIcon } from "lucide-react";
import { api, type GrowthMensagem } from "@/lib/api";

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
];

export default function AssistentesPage() {
  const [sel, setSel] = useState<Assistente>(ASSISTENTES[0]);
  const [msgs, setMsgs] = useState<GrowthMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMsgs([]); setTexto(""); }, [sel.id]);
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, enviando]);

  async function enviar(e: React.FormEvent, textoForcado?: string) {
    e.preventDefault();
    const t = (textoForcado ?? texto).trim();
    if (!t || enviando) return;
    const hist: GrowthMensagem[] = [...msgs, { role: "user", content: t }];
    setMsgs(hist); setTexto(""); setEnviando(true);
    try {
      const { resposta } = await api.assistenteChat(sel.id, hist);
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
              <div className="text-sm font-semibold">{sel.nome}</div>
              <div className="text-xs text-black/45">{sel.intro}</div>
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
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      meu ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-black/10 bg-paper text-black/80"
                    }`}>
                      {m.content}
                    </div>
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
    </div>
  );
}
