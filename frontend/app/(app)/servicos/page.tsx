"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useT } from "@/components/i18n-context";
import { api, type Servico } from "@/lib/api";

export default function ServicosPage() {
  const t = useT().servicos;
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [editar, setEditar] = useState<Servico | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.servicos().then(setServicos).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="text-sm text-black/50">{t.subtitulo}</p>
        </div>
        <button onClick={() => setEditar("novo")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> {t.adicionar}
        </button>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {servicos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          {t.vazio}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {servicos.map((s) => (
            <div key={s.id} className="group rounded-xl border border-black/10 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{s.nome}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-black/50">
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> {s.duracao_min} {t.min}</span>
                    {s.preco != null && <span>{t.moeda} {Number(s.preco).toFixed(2).replace(".", ",")}</span>}
                    {!s.ativo && <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px]">{t.inativo}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEditar(s)} aria-label={t.editarAria}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-black/50 hover:bg-black/[0.03]">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { if (confirm(`${t.apagar} "${s.nome}"?`)) api.apagarServico(s.id).then(carregar); }} aria-label={t.apagarAria}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-black/40 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editar && (
        <ModalServico
          servico={editar === "novo" ? null : editar}
          onClose={() => setEditar(null)}
          onSaved={() => { setEditar(null); carregar(); }}
        />
      )}
    </div>
  );
}

function ModalServico({ servico, onClose, onSaved }: { servico: Servico | null; onClose: () => void; onSaved: () => void }) {
  const t = useT().servicos;
  const c = useT().common;
  const [nome, setNome] = useState(servico?.nome ?? "");
  const [duracao, setDuracao] = useState(servico?.duracao_min ?? 30);
  const [preco, setPreco] = useState(servico?.preco != null ? String(servico.preco) : "");
  const [ativo, setAtivo] = useState(servico?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    setErro(null);
    const body = { nome: nome.trim(), duracao_min: duracao, preco: preco ? Number(preco.replace(",", ".")) : null, ativo };
    try {
      if (servico) await api.atualizarServico(servico.id, body);
      else await api.criarServico(body);
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{servico ? t.editarTitulo : t.novoTitulo}</h2>
        <label className="mb-1 block text-xs font-medium text-black/55">{t.nome}</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t.nomePh}
          className="mb-3 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-black/55">{t.duracao}</label>
            <input type="number" min={5} step={5} value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-black/55">{t.precoOpcional}</label>
            <input value={preco} onChange={(e) => setPreco(e.target.value)} placeholder={t.precoPh}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          </div>
        </div>
        <label className="mb-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> {t.ativo}
        </label>
        {erro && <p className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">{c.cancelar}</button>
          <button onClick={salvar} disabled={salvando || !nome.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {salvando ? c.salvando : c.salvar}
          </button>
        </div>
      </div>
    </div>
  );
}
