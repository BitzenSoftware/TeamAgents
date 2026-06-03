"use client";

import { useState } from "react";
import { useCliente } from "@/components/cliente-context";
import { api, type Campanha } from "@/lib/api";

export default function CampanhasPage() {
  const { cliente } = useCliente();
  const [nicho, setNicho] = useState("");
  const [dor, setDor] = useState("");
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Campanha | null>(null);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const c = await api.criarCampanha({
        nome_cliente: cliente.nome,
        nicho,
        dor_latente: dor,
        nome_campanha: nomeCampanha,
        link_calendario: link || undefined,
      });
      setResultado(c);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar campanha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Fábrica de Campanhas</h1>
        <p className="text-sm text-black/50">
          Gera anúncios de alta conversão para o seu tráfego pago
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={gerar}
          className="space-y-4 rounded-xl border border-black/10 bg-white/60 p-5"
        >
          <Field label="Nome da campanha">
            <input
              required
              value={nomeCampanha}
              onChange={(e) => setNomeCampanha(e.target.value)}
              className="campo"
              placeholder="Ex: Contabilidade Sem Burocracia"
            />
          </Field>
          <Field label="Nicho de mercado">
            <input
              required
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              className="campo"
              placeholder="Ex: Escritórios de contabilidade de pequeno porte"
            />
          </Field>
          <Field label="Dor latente / objetivo do negócio">
            <textarea
              required
              value={dor}
              onChange={(e) => setDor(e.target.value)}
              className="campo h-24 resize-none"
              placeholder="Ex: O dono é engolido pela burocracia e não consegue crescer."
            />
          </Field>
          <Field label="Link de calendário (opcional)">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="campo"
              placeholder="https://cal.com/voce/15min"
            />
          </Field>
          <button
            type="submit"
            disabled={loading || !cliente}
            className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? "A gerar com a IA…" : "Gerar anúncios"}
          </button>
          {erro && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
        </form>

        <div className="space-y-4">
          {!resultado && (
            <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
              Os anúncios gerados aparecem aqui.
            </div>
          )}
          {resultado && (
            <>
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                    Foco na Dor
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{resultado.anuncio_dor}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Foco no Benefício
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{resultado.anuncio_beneficio}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-paper p-4">
                <div className="text-xs font-medium text-black/50">Estratégia gerada</div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <Meta k="Gatilho" v={resultado.gatilho_principal} />
                  <Meta k="Palavra-chave" v={resultado.palavra_chave_gatilho} mono />
                  <Meta k="Dor-alvo" v={resultado.dor_alvo} />
                  <Meta k="Desejo-alvo" v={resultado.desejo_alvo} />
                </dl>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`.campo{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] text-black/40">{k}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{v}</dd>
    </div>
  );
}
