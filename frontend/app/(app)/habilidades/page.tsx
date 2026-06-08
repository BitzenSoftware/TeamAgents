"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Habilidade } from "@/lib/api";

export default function HabilidadesPage() {
  const [lista, setLista] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      await api.criarHabilidade(titulo.trim(), conteudo.trim());
      setTitulo("");
      setConteudo("");
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(h: Habilidade) {
    await api.atualizarHabilidade(h.id, { ativo: !h.ativo });
    carregar();
  }

  async function apagar(h: Habilidade) {
    if (!confirm(`Apagar a habilidade "${h.titulo}"?`)) return;
    await api.apagarHabilidade(h.id);
    carregar();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Habilidades</h1>
        <p className="text-sm text-black/50">
          O conhecimento da sua empresa. Os agentes consultam isto antes de gerar campanhas e ao
          conversar — ofertas, tom de voz, argumentos, respostas a objeções.
        </p>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {/* Adicionar */}
      <form onSubmit={adicionar} className="mb-6 space-y-3 rounded-xl border border-black/10 bg-white/60 p-5">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título — ex: Nossa oferta principal"
          className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Conteúdo — ex: Fazemos a contabilidade completa por R$499/mês, com garantia de resposta em 24h. Diferencial: app próprio e contador dedicado."
          className="h-28 w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "A guardar…" : "Adicionar habilidade"}
        </button>
      </form>

      {/* Lista */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-black/50">
          Habilidades guardadas {lista.length > 0 && `(${lista.length})`}
        </div>
        {loading && <p className="text-sm text-black/40">A carregar…</p>}
        {!loading && lista.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/40">
            Ainda não há habilidades. Adicione a primeira acima — quanto mais souber a empresa, melhores os anúncios e as conversas.
          </div>
        )}
        {lista.map((h) => (
          <div
            key={h.id}
            className={`rounded-xl border border-black/10 bg-white p-4 ${h.ativo ? "" : "opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{h.titulo}</div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">{h.conteudo}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => toggle(h)}
                  className="rounded-lg border border-black/15 px-2 py-1 text-xs hover:bg-black/5"
                  title={h.ativo ? "Desativar" : "Ativar"}
                >
                  {h.ativo ? "Ativa" : "Inativa"}
                </button>
                <button
                  type="button"
                  onClick={() => apagar(h)}
                  className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                >
                  Apagar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
