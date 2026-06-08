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
  const [publicando, setPublicando] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [userToken, setUserToken] = useState("");
  const [trocaOk, setTrocaOk] = useState<string | null>(null);
  const [erroTroca, setErroTroca] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [paginaInfo, setPaginaInfo] = useState<{ name: string } | null>(null);
  const [erroVerif, setErroVerif] = useState<string | null>(null);
  const [publicacaoOk, setPublicacaoOk] = useState(false);
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);

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

  async function publicarTeste() {
    setPublicando(true); setErroPublicacao(null); setPublicacaoOk(false);
    try {
      await api.postarFacebook("🤖 TeamAgents conectado com sucesso! Esta é uma publicação de teste automática.");
      setPublicacaoOk(true);
    } catch (err) {
      setErroPublicacao(err instanceof Error ? err.message : "Erro ao publicar");
    } finally { setPublicando(false); }
  }

  async function trocarToken() {
    if (!userToken.trim()) return;
    setTrocando(true); setErroTroca(null); setTrocaOk(null);
    try {
      const res = await api.trocarTokenFacebook(userToken.trim());
      setTrocaOk(res.name);
      setUserToken("");
      const novo = await api.getSocialConfig();
      setCfg(novo);
    } catch (err) {
      setErroTroca(err instanceof Error ? err.message : "Erro ao trocar token");
    } finally { setTrocando(false); }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <GuiaFacebook />
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
          <div className="flex flex-wrap items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={verificar}
              disabled={verificando || !cfg?.facebook_page_id || !cfg?.facebook_page_access_token}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {verificando ? "A verificar…" : "Verificar credenciais"}
            </button>
            <button type="button" onClick={publicarTeste}
              disabled={publicando || !cfg?.facebook_page_id || !cfg?.facebook_page_access_token}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {publicando ? "A publicar…" : "Publicação de teste"}
            </button>
          </div>
          {paginaInfo && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Ligado à página <strong>{paginaInfo.name}</strong>
            </div>
          )}
          {erroVerif && <Erro msg={erroVerif} />}
          {publicacaoOk && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Publicação de teste criada na página! Verifica o teu Facebook.
            </div>
          )}
          {erroPublicacao && <Erro msg={erroPublicacao} />}
        </form>

        {/* Renovação de token */}
        <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 space-y-3">
          <div>
            <p className="text-sm font-medium">Renovar token (60 dias)</p>
            <p className="text-xs text-black/40 mt-0.5">Cola aqui o User Access Token do Graph API Explorer para gerar um Page Token de longa duração que não expira.</p>
          </div>
          <CampoSecreto value={userToken} onChange={setUserToken} placeholder="EAAb... (User Token do Graph API Explorer)" />
          <div className="flex items-center gap-3">
            <button type="button" onClick={trocarToken}
              disabled={trocando || !userToken.trim()}
              className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {trocando ? "A trocar…" : "Converter para 60 dias"}
            </button>
          </div>
          {trocaOk && <p className="text-sm text-emerald-700">✓ Token de longa duração guardado para a página <strong>{trocaOk}</strong>!</p>}
          {erroTroca && <Erro msg={erroTroca} />}
        </div>
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
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [igInfo, setIgInfo] = useState<{ name: string; username: string; followers_count?: number } | null>(null);
  const [erroVerif, setErroVerif] = useState<string | null>(null);
  const [publicacaoOk, setPublicacaoOk] = useState(false);
  const [erroPublicacao, setErroPublicacao] = useState<string | null>(null);

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

  async function publicarTeste() {
    setPublicando(true); setErroPublicacao(null); setPublicacaoOk(false);
    try {
      await api.postarInstagram("🤖 TeamAgents conectado ao Instagram com sucesso! Esta é uma publicação de teste automática.");
      setPublicacaoOk(true);
    } catch (err) {
      setErroPublicacao(err instanceof Error ? err.message : "Erro ao publicar");
    } finally { setPublicando(false); }
  }

  if (loading) return <Carregando />;

  const temFbToken = !!cfg?.facebook_page_access_token;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <GuiaInstagram />
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
          <div className="flex flex-wrap items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={verificar}
              disabled={verificando || !cfg?.instagram_business_account_id || !temFbToken}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {verificando ? "A verificar…" : "Verificar conta"}
            </button>
            <button type="button" onClick={publicarTeste}
              disabled={publicando || !cfg?.instagram_business_account_id || !temFbToken}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {publicando ? "A publicar…" : "Publicação de teste"}
            </button>
          </div>
          {igInfo && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Ligado a <strong>@{igInfo.username}</strong> · {igInfo.name}
              {igInfo.followers_count !== undefined && ` · ${igInfo.followers_count.toLocaleString("pt-PT")} seguidores`}
            </div>
          )}
          {erroVerif && <Erro msg={erroVerif} />}
          {publicacaoOk && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              ✓ Publicação de teste criada no Instagram! Verifica o teu perfil @{igInfo?.username ?? "bitzensoftware"}.
            </div>
          )}
          {erroPublicacao && <Erro msg={erroPublicacao} />}
        </form>
      </div>
    </div>
  );
}

/* ─── Guia Facebook ────────────────────────────────────────────────── */
function GuiaFacebook() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-xl border border-black/8 bg-black/2 p-4 text-xs text-black/60">
      <button type="button" onClick={() => setAberto(v => !v)}
        className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-black/40 hover:text-black/60 transition-colors">
        <span>Guia de configuração</span>
        <span>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && (
        <div className="mt-4 space-y-4">
          <Passo n={1} titulo="Criar a App no Facebook">
            <p>Acede a <strong>developers.facebook.com</strong> → clica em <strong>My Apps</strong> → <strong>Create App</strong>.</p>
            <p className="mt-1">Preenche os campos:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li><strong>App name:</strong> Bitzen Social (ou o nome da tua empresa)</li>
              <li><strong>App contact email:</strong> o teu email</li>
            </ul>
            <p className="mt-1">Clica em <strong>Next</strong>.</p>
          </Passo>

          <Passo n={2} titulo="Selecionar casos de utilização">
            <p>No filtro lateral, clica em <strong>Content management</strong>.</p>
            <p className="mt-1">Seleciona <strong>os dois</strong> casos:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Manage messaging &amp; content on Instagram</li>
              <li>Manage everything on your Page</li>
            </ul>
            <p className="mt-1">Clica <strong>Next</strong> → <strong>Next</strong> → <strong>Next</strong> → <strong>Create App</strong>.</p>
          </Passo>

          <Passo n={3} titulo="Adicionar permissões à app">
            <p>No dashboard da app, clica em:</p>
            <p className="mt-1 font-medium text-black/70">"Customize the Manage everything on your Page use case"</p>
            <p className="mt-1">Vai a <strong>Permissions and features</strong> e clica <strong>+ Add</strong> em:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li><code className="bg-black/8 px-1 rounded">pages_manage_posts</code></li>
              <li><code className="bg-black/8 px-1 rounded">pages_read_engagement</code></li>
            </ul>
          </Passo>

          <Passo n={4} titulo="Gerar o Page Access Token">
            <p>Vai a <strong>Tools</strong> (menu superior) → <strong>Graph API Explorer</strong>.</p>
            <p className="mt-1">No painel direito:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Em <strong>Meta App</strong>, seleciona a tua app</li>
              <li>Em <strong>Permissions</strong>, adiciona: <code className="bg-black/8 px-1 rounded">pages_show_list</code>, <code className="bg-black/8 px-1 rounded">pages_read_engagement</code>, <code className="bg-black/8 px-1 rounded">pages_manage_posts</code></li>
              <li>Clica <strong>Generate Access Token</strong> e autoriza o popup</li>
            </ul>
          </Passo>

          <Passo n={5} titulo="Obter o Page ID e o Token">
            <p>No campo de query, escreve:</p>
            <code className="mt-1 block bg-black/8 px-2 py-1 rounded font-mono">me/accounts</code>
            <p className="mt-2">Clica <strong>Submit</strong>. Na resposta JSON, dentro de <code className="bg-black/8 px-1 rounded">data[0]</code>, copia:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li><code className="bg-black/8 px-1 rounded">"access_token"</code> → cola em <strong>Page Access Token</strong></li>
              <li><code className="bg-black/8 px-1 rounded">"id"</code> → cola em <strong>Facebook Page ID</strong></li>
            </ul>
            <div className="mt-2 rounded bg-amber-50 border border-amber-200 p-2 text-amber-800">
              ⚠️ Copia o token do <strong>JSON da resposta</strong>, NÃO o token do painel direito. São tokens diferentes!
            </div>
          </Passo>
        </div>
      )}
    </div>
  );
}

/* ─── Guia Instagram ───────────────────────────────────────────────── */
function GuiaInstagram() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-xl border border-black/8 bg-black/2 p-4 text-xs text-black/60">
      <button type="button" onClick={() => setAberto(v => !v)}
        className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-black/40 hover:text-black/60 transition-colors">
        <span>Guia de configuração</span>
        <span>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && (
        <div className="mt-4 space-y-4">
          <Passo n={1} titulo="Pré-requisito: aba Facebook">
            <p>O Instagram usa o <strong>mesmo Page Access Token</strong> do Facebook.</p>
            <p className="mt-1">Configura primeiro a aba <strong>Facebook</strong> antes de continuar aqui.</p>
          </Passo>

          <Passo n={2} titulo="Ligar o Instagram à Página">
            <p>Na tua Página do Facebook, clica em <strong>Configurações</strong>.</p>
            <p className="mt-1">No menu lateral, procura <strong>Contas associadas</strong> → <strong>Instagram</strong>.</p>
            <p className="mt-1">Clica em Instagram → <strong>Ligar conta</strong> e entra com as credenciais da tua conta <strong>Instagram Business ou Creator</strong>.</p>
            <div className="mt-2 rounded bg-blue-50 border border-blue-200 p-2 text-blue-800">
              ℹ️ O Instagram tem de ser uma conta <strong>Business</strong> ou <strong>Creator</strong>, não pessoal.
            </div>
          </Passo>

          <Passo n={3} titulo="Obter o Instagram Business Account ID">
            <p>Volta ao <strong>Graph API Explorer</strong> (Tools → Graph API Explorer).</p>
            <p className="mt-1">No campo de query, escreve (substitui pelo teu Page ID):</p>
            <code className="mt-1 block bg-black/8 px-2 py-1 rounded font-mono break-all">{'<PAGE_ID>?fields=instagram_business_account'}</code>
            <p className="mt-2">Clica <strong>Submit</strong>. Na resposta, copia o valor de <code className="bg-black/8 px-1 rounded">"id"</code> dentro de <code className="bg-black/8 px-1 rounded">instagram_business_account</code>.</p>
            <p className="mt-1">É um número com ~17 dígitos. Cola-o em <strong>Instagram Business Account ID</strong> acima.</p>
          </Passo>

          <Passo n={4} titulo="Renovar o token (a cada 60 dias)">
            <p>O Page Access Token expira em <strong>60 dias</strong>. Quando expirar:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Vai ao Graph API Explorer → Generate Access Token</li>
              <li>Corre <code className="bg-black/8 px-1 rounded">me/accounts</code></li>
              <li>Copia o novo <code className="bg-black/8 px-1 rounded">access_token</code> do JSON</li>
              <li>Atualiza na aba <strong>Facebook</strong> (o Instagram atualiza automaticamente)</li>
            </ul>
          </Passo>
        </div>
      )}
    </div>
  );
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-black/70 mb-1">{titulo}</p>
        {children}
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
