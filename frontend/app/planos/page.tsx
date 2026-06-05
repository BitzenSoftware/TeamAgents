"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, SUPERADMIN_EMAIL, type Plano } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

export default function PlanosPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    api
      .planos()
      .then((p) => setPlanos([...p].sort((a, b) => a.ordem - b.ordem)))
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // guarda no cliente; o backend é a barreira real
    if (!authLoading && !isAdmin) {
      router.replace("/pipeline");
      return;
    }
    if (isAdmin) carregar();
  }, [authLoading, isAdmin, carregar, router]);

  if (!authLoading && !isAdmin) return null;

  async function novo() {
    const p = await api.criarPlano({ nome: "Novo plano", creditos_mensais: 0, preco: 0, ordem: planos.length + 1 });
    setPlanos((l) => [...l, p]);
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Planos</h1>
          <p className="text-sm text-black/50">
            Gestão de planos e packs de créditos. Visível apenas ao administrador.
          </p>
        </div>
        <button
          type="button"
          onClick={novo}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
        >
          + Novo plano
        </button>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
      {loading && <p className="text-sm text-black/40">A carregar…</p>}

      <div className="space-y-3">
        {planos.map((p) => (
          <PlanoCard key={p.id} plano={p} onChanged={carregar} />
        ))}
      </div>
    </div>
  );
}

function PlanoCard({ plano, onChanged }: { plano: Plano; onChanged: () => void }) {
  const [p, setP] = useState<Plano>(plano);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => setP(plano), [plano]);

  function set<K extends keyof Plano>(k: K, v: Plano[K]) {
    setP((x) => ({ ...x, [k]: v }));
    setOk(false);
  }

  async function guardar() {
    setSaving(true);
    try {
      await api.atualizarPlano(p.id, {
        nome: p.nome,
        creditos_mensais: Number(p.creditos_mensais),
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
    if (!confirm(`Apagar o plano "${p.nome}"?`)) return;
    await api.apagarPlano(p.id);
    onChanged();
  }

  return (
    <div className={`rounded-xl border border-black/10 bg-white p-4 ${p.ativo ? "" : "opacity-60"}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Nome">
          <input className="ip" value={p.nome} onChange={(e) => set("nome", e.target.value)} />
        </Campo>
        <Campo label="Créditos / mês">
          <input className="ip" type="number" value={p.creditos_mensais} onChange={(e) => set("creditos_mensais", Number(e.target.value))} />
        </Campo>
        <Campo label="Preço (R$)">
          <input className="ip" type="number" step="0.01" value={p.preco} onChange={(e) => set("preco", Number(e.target.value))} />
        </Campo>
        <Campo label="Ordem">
          <input className="ip" type="number" value={p.ordem} onChange={(e) => set("ordem", Number(e.target.value))} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo label="Stripe price_id">
            <input className="ip font-mono" value={p.stripe_price_id ?? ""} onChange={(e) => set("stripe_price_id", e.target.value)} placeholder="price_..." />
          </Campo>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.ativo} onChange={(e) => set("ativo", e.target.checked)} />
          Ativo
        </label>
        <div className="ml-auto flex items-center gap-2">
          {ok && <span className="text-sm text-emerald-700">✓ Guardado</span>}
          <button type="button" onClick={guardar} disabled={saving} className="rounded-lg bg-ink px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
            {saving ? "…" : "Guardar"}
          </button>
          <button type="button" onClick={apagar} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
            Apagar
          </button>
        </div>
      </div>

      <style>{`.ip{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.4rem .6rem;font-size:.875rem;background:#fff}`}</style>
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
