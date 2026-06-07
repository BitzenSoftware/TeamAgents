"use client";

import { useEffect, useState } from "react";
import { api, type Config, type SocialConfig } from "@/lib/api";

type Aba = "whatsapp" | "discord" | "facebook" | "instagram";

const ABAS: { id: Aba; label: string; sub: string }[] = [
  { id: "whatsapp",  label: "WhatsApp",  sub: "Evolution API / Agenda" },
  { id: "discord",   label: "Discord",   sub: "Relatórios de BI" },
  { id: "facebook",  label: "Facebook",  sub: "Publicação em Pages" },
  { id: "instagram", label: "Instagram", sub: "Conta Business" },
];

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>("whatsapp");

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-black/50">Integrações e credenciais da tua empresa</p>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-black/10 bg-black/3 p-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-all ${
              aba === a.id
                ? "bg-white shadow-sm font-medium text-ink"
                : "text-black/50 hover:text-ink"
            }`}
          >
            <div className="text-xs font-semibold">{a.label}</div>
            <div className="text-[10px] text-black/40">{a.sub}</div>
          </button>
        ))}
      </div>

      {aba === "whatsapp"  && <AbaWhatsApp />}
      {aba === "discord"   && <AbaDiscord />}
      {aba === "facebook"  && <AbaFacebook />}
      {aba === "instagram" && <AbaInstagram />}
    </div>
  );
}

/* ─── WhatsApp ─────────────────────────────────────────────────────── */
function AbaWhatsApp() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    api.getConfig().then(setCfg).catch((e) => setErro(e.message)).finally(() => setLoading(false));
  }, []);

  function set<K extends keyof Config>(k: K, v: Config[K]) {
    setCfg((c) => (c ? { ...c, [k]: v } : c));
    setOk(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true); setErro(null); setOk(false);
    try {
      setCfg(await api.updateConfig({
        whatsapp_instance_name: cfg.whatsapp_instance_name,
        whatsapp_token: cfg.whatsapp_token,
        whatsapp_api_url: cfg.whatsapp_api_url ?? "",
        calendario_link: cfg.calendario_link,
        whatsapp_dono: cfg.whatsapp_dono ?? "",
        limite_mensal_leads: cfg.limite_mensal_leads,
      }));
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally { setSaving(false); }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <Instrucoes steps={[
          "Instala a Evolution API no teu servidor (VPS ou Railway)",
          "Cria uma instância e copia o nome e o token gerado",
          "Liga o WhatsApp lendo o QR Code na interface da Evolution API",
          "Cola o Webhook URL do TeamAgents nas definições da instância",
          "Preenche o teu número de WhatsApp para receber os relatórios de BI",
        ]} />
      </div>
      <div className="col-span-3">
        {erro && <Erro msg={erro} />}
        {cfg && (
          <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Instância do WhatsApp (Evolution)">
                <input className="campo" value={cfg.whatsapp_instance_name ?? ""}
                  onChange={(e) => set("whatsapp_instance_name", e.target.value)} />
              </Campo>
              <Campo label="Token da instância">
                <CampoSecreto value={cfg.whatsapp_token ?? ""}
                  onChange={(v) => set("whatsapp_token", v)} />
              </Campo>
              <Campo label="URL da Evolution API (opcional)" className="col-span-2">
                <CampoSecreto value={cfg.whatsapp_api_url ?? ""}
                  onChange={(v) => set("whatsapp_api_url", v)}
                  placeholder="https://api.evolution..." />
              </Campo>
              <Campo label="Link de calendário" className="col-span-2">
                <input className="campo" value={cfg.calendario_link ?? ""}
                  onChange={(e) => set("calendario_link", e.target.value)}
                  placeholder="https://cal.com/voce/15min" />
              </Campo>
              <Campo label="WhatsApp do dono (recebe relatórios)">
                <input className="campo" value={cfg.whatsapp_dono ?? ""}
                  onChange={(e) => set("whatsapp_dono", e.target.value)}
                  placeholder="+5511999999999" />
              </Campo>
              <Campo label="Limite mensal de leads">
                <input type="number" className="campo" value={cfg.limite_mensal_leads}
                  onChange={(e) => set("limite_mensal_leads", Number(e.target.value))} />
              </Campo>
            </div>
            <BotaoGuardar saving={saving} ok={ok} />
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Discord ──────────────────────────────────────────────────────── */
function AbaDiscord() {
  const [cfg, setCfg] = useState<SocialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testando, setTestando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [testeOk, setTesteOk] = useState(false);
  const [erroTeste, setErroTeste] = useState<string | null>(null);

  useEffect(() => {
    api.getSocialConfig().then(setCfg).catch((e) => setErro(e.message)).finally(() => setLoading(false));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true); setErro(null); setOk(false);
    try {
      setCfg(await api.updateSocialConfig({ discord_webhook_url: cfg.discord_webhook_url ?? "" }));
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally { setSaving(false); }
  }

  async function testar() {
    setTestando(true); setErroTeste(null); setTesteOk(false);
    try {
      await api.testarDiscord();
      setTesteOk(true);
    } catch (err) {
      setErroTeste(err instanceof Error ? err.message : "Erro no teste");
    } finally { setTestando(false); }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <Instrucoes steps={[
          "Abre o teu servidor Discord",
          "Vai a Definições do Canal → Integrações → Webhooks",
          "Clica em 'Novo Webhook' e copia o URL",
          "Cola o URL abaixo e guarda",
        ]} />
      </div>
      <div className="col-span-3">
        {erro && <Erro msg={erro} />}
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label="Webhook URL do Discord">
            <CampoSecreto
              value={cfg?.discord_webhook_url ?? ""}
              onChange={(v) => setCfg((c) => c ? { ...c, discord_webhook_url: v } : c)}
              placeholder="https://discord.com/api/webhooks/..."
            />
          </Campo>
          <div className="flex items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={testar} disabled={testando || !cfg?.discord_webhook_url}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {testando ? "A testar…" : "Testar ligação"}
            </button>
          </div>
          {testeOk && <p className="text-sm text-emerald-700">✓ Mensagem de teste enviada ao canal!</p>}
          {erroTeste && <Erro msg={erroTeste} />}
        </form>
      </div>
    </div>
  );
}

/* ─── Facebook ─────────────────────────────────────────────────────── */
function AbaFacebook() {
  const [cfg, setCfg] = useState<SocialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [paginaInfo, setPaginaInfo] = useState<{ name: string } | null>(null);
  const [erroVerif, setErroVerif] = useState<string | null>(null);

  useEffect(() => {
    api.getSocialConfig().then(setCfg).catch((e) => setErro(e.message)).finally(() => setLoading(false));
  }, []);

  function set(k: keyof SocialConfig, v: string) {
    setCfg((c) => c ? { ...c, [k]: v } : c);
    setOk(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true); setErro(null); setOk(false);
    try {
      setCfg(await api.updateSocialConfig({
        facebook_page_id: cfg.facebook_page_id ?? "",
        facebook_page_access_token: cfg.facebook_page_access_token ?? "",
      }));
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally { setSaving(false); }
  }

  async function verificar() {
    setVerificando(true); setErroVerif(null); setPaginaInfo(null);
    try {
      setPaginaInfo(await api.verificarFacebook());
    } catch (err) {
      setErroVerif(err instanceof Error ? err.message : "Token inválido ou Page ID incorreto");
    } finally { setVerificando(false); }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <Instrucoes steps={[
          "Acede a developers.facebook.com e cria uma App (tipo: Business)",
          "Em Graph API Explorer, gera um User Token com permissão pages_manage_posts",
          "Troca o User Token por um Page Token de longa duração",
          "Copia o Page ID (visível nas definições da Página) e o Page Access Token",
        ]} />
      </div>
      <div className="col-span-3">
        {erro && <Erro msg={erro} />}
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label="Facebook Page ID">
            <CampoSecreto
              value={cfg?.facebook_page_id ?? ""}
              onChange={(v) => set("facebook_page_id", v)}
              placeholder="123456789012345"
            />
          </Campo>
          <Campo label="Page Access Token">
            <CampoSecreto
              value={cfg?.facebook_page_access_token ?? ""}
              onChange={(v) => set("facebook_page_access_token", v)}
              placeholder="EAAb..."
            />
            <p className="mt-1 text-xs text-black/40">Token de longa duração (60 dias). Renova antes do prazo expirar.</p>
          </Campo>
          <div className="flex items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={verificar}
              disabled={verificando || !cfg?.facebook_page_id || !cfg?.facebook_page_access_token}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {verificando ? "A verificar…" : "Verificar credenciais"}
            </button>
          </div>
          {paginaInfo && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Ligado à página <strong>{paginaInfo.name}</strong>
            </div>
          )}
          {erroVerif && <Erro msg={erroVerif} />}
        </form>
      </div>
    </div>
  );
}

/* ─── Instagram ────────────────────────────────────────────────────── */
function AbaInstagram() {
  const [cfg, setCfg] = useState<SocialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [igInfo, setIgInfo] = useState<{ name: string; username: string; followers_count?: number } | null>(null);
  const [erroVerif, setErroVerif] = useState<string | null>(null);

  useEffect(() => {
    api.getSocialConfig().then(setCfg).catch((e) => setErro(e.message)).finally(() => setLoading(false));
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true); setErro(null); setOk(false);
    try {
      setCfg(await api.updateSocialConfig({
        instagram_business_account_id: cfg.instagram_business_account_id ?? "",
      }));
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally { setSaving(false); }
  }

  async function verificar() {
    setVerificando(true); setErroVerif(null); setIgInfo(null);
    try {
      setIgInfo(await api.verificarInstagram());
    } catch (err) {
      setErroVerif(err instanceof Error ? err.message : "ID incorreto ou token sem permissão");
    } finally { setVerificando(false); }
  }

  if (loading) return <Carregando />;

  const temFbToken = !!cfg?.facebook_page_access_token;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <Instrucoes steps={[
          "Garante que tens a aba Facebook configurada (partilham o mesmo token)",
          "Na tua Facebook Page → Definições → Instagram → Liga a conta",
          "Em Graph API Explorer: GET /{facebook-page-id}?fields=instagram_business_account",
          "Copia o 'id' devolvido — esse é o teu Instagram Business Account ID",
        ]} />
      </div>
      <div className="col-span-3">
        {!temFbToken && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            ⚠️ Configura primeiro o <strong>Facebook Page Access Token</strong> — o Instagram usa o mesmo token.
          </div>
        )}
        {erro && <Erro msg={erro} />}
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label="Instagram Business Account ID">
            <input className="campo" value={cfg?.instagram_business_account_id ?? ""}
              onChange={(e) => setCfg((c) => c ? { ...c, instagram_business_account_id: e.target.value } : c)}
              placeholder="17841400000000000" />
            <p className="mt-1 text-xs text-black/40">Requer conta Instagram Business ligada a uma Facebook Page.</p>
          </Campo>
          <div className="flex items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={verificar}
              disabled={verificando || !cfg?.instagram_business_account_id || !temFbToken}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {verificando ? "A verificar…" : "Verificar conta"}
            </button>
          </div>
          {igInfo && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Ligado a <strong>@{igInfo.username}</strong> · {igInfo.name}
              {igInfo.followers_count !== undefined && ` · ${igInfo.followers_count.toLocaleString("pt-PT")} seguidores`}
            </div>
          )}
          {erroVerif && <Erro msg={erroVerif} />}
        </form>
      </div>
    </div>
  );
}

/* ─── Componentes partilhados ──────────────────────────────────────── */
function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function CampoSecreto({ value, onChange, placeholder = "" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="relative">
      <input
        type={visivel ? "text" : "password"}
        className="campo pr-28"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={copiar}
          disabled={!value}
          className="rounded px-2 py-1 text-xs text-black/40 hover:bg-black/5 hover:text-ink disabled:opacity-30 transition-colors"
          title="Copiar"
        >
          {copiado ? "✓" : "Copiar"}
        </button>
        <span className="text-black/15">|</span>
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="rounded px-2 py-1 text-xs text-black/40 hover:bg-black/5 hover:text-ink transition-colors"
        >
          {visivel ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

function BotaoGuardar({ saving, ok }: { saving: boolean; ok: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={saving}
        className="rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
        {saving ? "A guardar…" : "Guardar"}
      </button>
      {ok && <span className="text-sm text-emerald-700">✓ Guardado</span>}
    </div>
  );
}

function Erro({ msg }: { msg: string }) {
  return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{msg}</p>;
}

function Carregando() {
  return <p className="text-sm text-black/40">A carregar…</p>;
}

function Instrucoes({ steps }: { steps: string[] }) {
  return (
    <div className="rounded-xl border border-black/8 bg-black/2 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">Como configurar</p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-xs text-black/60 leading-relaxed">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black/8 text-[10px] font-bold text-black/40">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
