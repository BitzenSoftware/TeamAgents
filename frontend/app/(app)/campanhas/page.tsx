"use client";

import { useCallback, useEffect, useState } from "react";
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

  const [lista, setLista] = useState<Campanha[]>([]);
  const [novaId, setNovaId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.campanhas().then(setLista).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setLoading(true);
    setErro(null);
    try {
      const c = await api.criarCampanha({
        nome_cliente: cliente.nome,
        nicho,
        dor_latente: dor,
        nome_campanha: nomeCampanha,
        link_calendario: link || undefined,
      });
      setNovaId(c.id);
      setNomeCampanha("");
      setNicho("");
      setDor("");
      setLink("");
      carregar();
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
        <p className="text-sm text-black/50">Gera anúncios de alta conversão para o seu tráfego pago</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={gerar} className="space-y-4 rounded-xl border border-black/10 bg-white/60 p-5">
          <Field label="Nome da campanha">
            <input required value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} className="campo" placeholder="Ex: Contabilidade Sem Burocracia" />
          </Field>
          <Field label="Nicho de mercado">
            <input required value={nicho} onChange={(e) => setNicho(e.target.value)} className="campo" placeholder="Ex: Escritórios de contabilidade de pequeno porte" />
          </Field>
          <Field label="Dor latente / objetivo do negócio">
            <textarea required value={dor} onChange={(e) => setDor(e.target.value)} className="campo h-24 resize-none" placeholder="Ex: O dono é engolido pela burocracia e não consegue crescer." />
          </Field>
          <Field label="Link de calendário (opcional)">
            <input value={link} onChange={(e) => setLink(e.target.value)} className="campo" placeholder="https://cal.com/voce/15min" />
          </Field>
          <button type="submit" disabled={loading || !cliente} className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
            {loading ? "A gerar com a IA…" : "Gerar anúncios"}
          </button>
          {erro && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
        </form>

        <div className="space-y-3">
          <div className="text-xs font-medium text-black/50">
            Campanhas geradas {lista.length > 0 && `(${lista.length})`}
          </div>
          {lista.length === 0 && (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
              As campanhas geradas aparecem aqui e ficam guardadas.
            </div>
          )}
          {lista.map((c) => (
            <CampanhaCard key={c.id} c={c} aberta={c.id === novaId} />
          ))}
        </div>
      </div>

      <style>{`.campo{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff}`}</style>
    </div>
  );
}

function CampanhaCard({ c, aberta }: { c: Campanha; aberta: boolean }) {
  return (
    <details open={aberta} className="rounded-xl border border-black/10 bg-white p-4">
      <summary className="cursor-pointer">
        <span className="font-medium">{c.nome_campanha}</span>
        <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 font-mono text-[11px]">
          {c.palavra_chave_gatilho}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="rounded-lg border border-black/10 p-3">
          <span className="mb-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Foco na Dor</span>
          <p className="whitespace-pre-wrap text-sm">{c.anuncio_dor}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-3">
          <span className="mb-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Foco no Benefício</span>
          <p className="whitespace-pre-wrap text-sm">{c.anuncio_beneficio}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 text-sm">
          <Meta k="Gatilho" v={c.gatilho_principal} />
          <Meta k="Dor-alvo" v={c.dor_alvo} />
          <Meta k="Desejo-alvo" v={c.desejo_alvo} />
          <Meta k="Palavra-chave" v={c.palavra_chave_gatilho} mono />
        </div>
      </div>
    </details>
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
      <div className="text-[11px] text-black/40">{k}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{v}</div>
    </div>
  );
}
