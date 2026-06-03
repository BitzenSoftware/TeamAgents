"use client";

import { useEffect, useState } from "react";
import { api, type Config } from "@/lib/api";

export default function ConfiguracoesPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api
      .getConfig()
      .then(setCfg)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
    setOk(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    setErro(null);
    setOk(false);
    try {
      const atualizado = await api.updateConfig({
        whatsapp_instance_name: cfg.whatsapp_instance_name,
        whatsapp_token: cfg.whatsapp_token,
        whatsapp_api_url: cfg.whatsapp_api_url ?? "",
        calendario_link: cfg.calendario_link,
        whatsapp_dono: cfg.whatsapp_dono ?? "",
        limite_mensal_leads: cfg.limite_mensal_leads,
      });
      setCfg(atualizado);
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-black/50">WhatsApp, agenda e limites da tua empresa</p>
      </header>

      {loading && <p className="text-sm text-black/40">A carregar…</p>}
      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {cfg && (
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label="Instância do WhatsApp (Evolution)">
            <input className="campo" value={cfg.whatsapp_instance_name}
              onChange={(e) => set("whatsapp_instance_name", e.target.value)} required />
          </Campo>
          <Campo label="Token da instância">
            <input className="campo" value={cfg.whatsapp_token}
              onChange={(e) => set("whatsapp_token", e.target.value)} required />
          </Campo>
          <Campo label="URL da Evolution API (opcional)">
            <input className="campo" value={cfg.whatsapp_api_url ?? ""}
              onChange={(e) => set("whatsapp_api_url", e.target.value)} placeholder="https://api.evolution..." />
          </Campo>
          <Campo label="Link de calendário">
            <input className="campo" value={cfg.calendario_link}
              onChange={(e) => set("calendario_link", e.target.value)} required />
          </Campo>
          <Campo label="WhatsApp do dono (recebe o relatório)">
            <input className="campo" value={cfg.whatsapp_dono ?? ""}
              onChange={(e) => set("whatsapp_dono", e.target.value)} placeholder="+5511999999999" />
          </Campo>
          <Campo label="Limite mensal de leads">
            <input type="number" className="campo" value={cfg.limite_mensal_leads}
              onChange={(e) => set("limite_mensal_leads", Number(e.target.value))} />
          </Campo>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {saving ? "A guardar…" : "Guardar alterações"}
            </button>
            {ok && <span className="text-sm text-emerald-700">✓ Guardado</span>}
          </div>
        </form>
      )}

      <style>{`.campo{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff}`}</style>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}
