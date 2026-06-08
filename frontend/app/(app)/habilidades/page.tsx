"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Habilidade } from "@/lib/api";

export default function HabilidadesPage() {
  const [lista, setLista] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

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

  async function toggle(h: Habilidade) {
    await api.atualizarHabilidade(h.id, { ativo: !h.ativo });
    carregar();
  }

  async function apagar(h: Habilidade) {
    if (!window.confirm(`Apagar a habilidade "${h.titulo}"?`)) return;
    await api.apagarHabilidade(h.id);
    carregar();
  }

  return (
    <div className="max-w-5xl p-6">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Habilidades</h1>
          <p className="text-sm text-black/50">
            O conhecimento da sua empresa. Os agentes consultam isto antes de gerar campanhas e ao
            conversar — ofertas, tom de voz, argumentos, respostas a objeções.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          + Adicionar habilidade
        </button>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      <div className="mb-3 text-xs font-medium text-black/50">
        Habilidades guardadas {lista.length > 0 && `(${lista.length})`}
      </div>

      {loading && <p className="text-sm text-black/40">A carregar…</p>}
      {!loading && lista.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/40">
          Ainda não há habilidades. Clica em <strong>“+ Adicionar habilidade”</strong> — quanto mais
          souber a empresa, melhores os anúncios e as conversas.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {lista.map((h) => (
          <HabilidadeCard key={h.id} h={h} onToggle={() => toggle(h)} onApagar={() => apagar(h)} />
        ))}
      </div>

      {modalAberto && (
        <ModalAdicionar
          onClose={() => setModalAberto(false)}
          onSaved={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Card expansível ---------------- */
function HabilidadeCard({
  h,
  onToggle,
  onApagar,
}: {
  h: Habilidade;
  onToggle: () => void;
  onApagar: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className={`self-start rounded-xl border border-black/10 bg-white ${h.ativo ? "" : "opacity-60"}`}>
      <button
        type="button"
        onClick={() => setAberto((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="min-w-0 truncate font-medium">{h.titulo}</span>
        <span className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              h.ativo ? "bg-emerald-100 text-emerald-700" : "bg-black/10 text-black/50"
            }`}
          >
            {h.ativo ? "Ativa" : "Inativa"}
          </span>
          <span className="text-xs text-black/30">{aberto ? "▲" : "▼"}</span>
        </span>
      </button>

      {aberto && (
        <div className="border-t border-black/5 px-4 pb-4 pt-3">
          <p className="whitespace-pre-wrap text-sm text-black/70">{h.conteudo}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5"
            >
              {h.ativo ? "Desativar" : "Ativar"}
            </button>
            <button
              type="button"
              onClick={onApagar}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
            >
              Apagar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Modal de criação ---------------- */
function ModalAdicionar({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      await api.criarHabilidade(titulo.trim(), conteudo.trim());
      onSaved();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">Nova habilidade</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            ×
          </button>
        </div>
        <form onSubmit={adicionar} className="space-y-3 p-5">
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
            className="h-36 w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
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
              disabled={saving}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "A guardar…" : "Adicionar habilidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
