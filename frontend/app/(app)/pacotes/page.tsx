"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, SUPERADMIN_EMAIL, type Pacote } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

export default function PacotesPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    api
      .pacotes()
      .then((p) => setPacotes([...p].sort((a, b) => a.ordem - b.ordem)))
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace("/pipeline");
      return;
    }
    if (isAdmin) carregar();
  }, [authLoading, isAdmin, carregar, router]);

  useEffect(() => {
    if (pacotes.length === 0) setSelId(null);
    else if (!pacotes.some((p) => p.id === selId)) setSelId(pacotes[0].id);
  }, [pacotes, selId]);

  if (!authLoading && !isAdmin) return null;

  const selecionado = pacotes.find((p) => p.id === selId) ?? null;

  async function novo() {
    const p = await api.criarPacote({ nome: "Novo pacote", creditos: 0, preco: 0, ordem: pacotes.length + 1 });
    setPacotes((l) => [...l, p].sort((a, b) => a.ordem - b.ordem));
    setSelId(p.id);
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Pacotes de Créditos</h1>
          <button
            type="button"
            onClick={novo}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + Novo pacote
          </button>
        </div>
        <p className="mt-1 text-sm text-black/50">
          Pacotes de compra única (top-ups). Os créditos somam-se ao saldo do cliente e não expiram.
        </p>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
      {loading && <p className="text-sm text-black/40">Carregando…</p>}

      {!loading && pacotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Ainda não há pacotes. Clique em <strong>“+ Novo pacote”</strong> para criar o primeiro.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Lista (master) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="mb-2 text-xs font-medium text-black/50">Pacotes ({pacotes.length})</div>
            <div className="space-y-1.5">
              {pacotes.map((p) => {
                const sel = p.id === selId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelId(p.id)}
                    className={`block w-full rounded-lg border px-3 py-2.5 text-left transition ${
                      sel ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"
                    } ${p.ativo ? "" : "opacity-60"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`break-words text-sm ${sel ? "font-semibold text-brand" : "font-medium"}`}>
                        {p.nome}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          p.ativo ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="mt-0.5 break-words text-[11px] text-black/40">
                      {p.creditos.toLocaleString("pt-BR")} créditos · R$ {Number(p.preco).toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Detalhe (detail) */}
          <section className="md:col-span-8 lg:col-span-9">
            {selecionado ? (
              <PacoteEditor key={selecionado.id} pacote={selecionado} onChanged={carregar} />
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
                Selecione um pacote à esquerda.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PacoteEditor({ pacote, onChanged }: { pacote: Pacote; onChanged: () => void }) {
  const [p, setP] = useState<Pacote>(pacote);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [showPid, setShowPid] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);

  useEffect(() => setP(pacote), [pacote]);

  function set<K extends keyof Pacote>(k: K, v: Pacote[K]) {
    setP((x) => ({ ...x, [k]: v }));
    setOk(false);
  }

  async function registarStripe() {
    setStripeBusy(true);
    setStripeMsg(null);
    try {
      const atualizado = await api.registarPacoteStripe(p.id);
      setP(atualizado);
      setStripeMsg("✓ Cadastrado na Stripe — price_id preenchido.");
      onChanged();
    } catch (e) {
      setStripeMsg(`Erro: ${e instanceof Error ? e.message : "falha na Stripe"}`);
    } finally {
      setStripeBusy(false);
    }
  }

  async function guardar() {
    setSaving(true);
    try {
      await api.atualizarPacote(p.id, {
        nome: p.nome,
        creditos: Number(p.creditos),
        preco: Number(p.preco),
        stripe_price_id: p.stripe_price_id || null,
        ativo: p.ativo,
        ordem: Number(p.ordem),
      });
      setOk(true);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function apagar() {
    if (!confirm(`Apagar o pacote "${p.nome}"?`)) return;
    await api.apagarPacote(p.id);
    onChanged();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-gradient-to-r from-brand to-brand-dark px-4 py-3 text-white">
        <div>
          <div className="text-sm font-semibold">{p.nome || "Pacote"}</div>
          <div className="text-xs text-white/70">
            {Number(p.creditos).toLocaleString("pt-BR")} créditos · R$ {Number(p.preco).toFixed(2)} (única)
          </div>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            p.ativo ? "bg-white/20 text-white" : "bg-black/20 text-white/70"
          }`}
        >
          {p.ativo ? "Ativo" : "Inativo"}
        </span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Campo label="Nome">
            <input className="ip" title="Nome" value={p.nome} onChange={(e) => set("nome", e.target.value)} />
          </Campo>
          <Campo label="Créditos">
            <input className="ip" title="Créditos" type="number" value={p.creditos} onChange={(e) => set("creditos", Number(e.target.value))} />
          </Campo>
          <Campo label="Preço (R$)">
            <input className="ip" title="Preço (R$)" type="number" step="0.01" value={p.preco} onChange={(e) => set("preco", Number(e.target.value))} />
          </Campo>
          <Campo label="Ordem">
            <input className="ip" title="Ordem" type="number" value={p.ordem} onChange={(e) => set("ordem", Number(e.target.value))} />
          </Campo>
          <div className="sm:col-span-2">
            <Campo label="Stripe price_id">
              <div className="relative">
                <input
                  className="ip font-mono pr-16"
                  title="Stripe price_id"
                  type={showPid ? "text" : "password"}
                  value={p.stripe_price_id ?? ""}
                  onChange={(e) => set("stripe_price_id", e.target.value)}
                  placeholder="price_..."
                />
                <button
                  type="button"
                  onClick={() => setShowPid((v) => !v)}
                  className="absolute inset-y-0 right-2 my-auto h-fit text-xs text-black/40 hover:text-ink"
                >
                  {showPid ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </Campo>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={registarStripe}
                disabled={stripeBusy}
                className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40"
              >
                {stripeBusy ? "Cadastrando…" : p.stripe_price_id ? "↻ Recriar preço na Stripe" : "⚡ Criar na Stripe"}
              </button>
              {p.stripe_price_id ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  Stripe ✓
                </span>
              ) : (
                <span className="text-[11px] text-black/40">
                  Cria o produto/preço de compra única na Stripe automaticamente.
                </span>
              )}
            </div>
            {stripeMsg && (
              <p className={`mt-1 text-xs ${stripeMsg.startsWith("Erro") ? "text-rose-600" : "text-emerald-700"}`}>
                {stripeMsg}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.ativo} onChange={(e) => set("ativo", e.target.checked)} />
            Ativo
          </label>
          <div className="ml-auto flex items-center gap-2">
            {ok && <span className="text-sm text-emerald-700">✓ Salvo</span>}
            <button type="button" onClick={guardar} disabled={saving} className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {saving ? "…" : "Salvar"}
            </button>
            <button type="button" onClick={apagar} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
              Apagar
            </button>
          </div>
        </div>

        <style>{`.ip{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.4rem .6rem;font-size:.875rem;background:#fff}`}</style>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/55">{label}</span>
      {children}
    </label>
  );
}
