"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Config, type EmailAccount, type SocialConfig } from "@/lib/api";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";
const FB_SCOPES = "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,instagram_manage_insights,public_profile";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type Aba = "whatsapp" | "discord" | "facebook" | "instagram" | "email";

const ABAS: { id: Aba; label: string; sub: string }[] = [
  { id: "whatsapp",  label: "WhatsApp",  sub: "Evolution API / Agenda" },
  { id: "discord",   label: "Discord",   sub: "Relatórios de BI" },
  { id: "facebook",  label: "Facebook",  sub: "Publicação em Pages" },
  { id: "instagram", label: "Instagram", sub: "Conta Business" },
  { id: "email",     label: "Email",     sub: "Gmail / Agente Executivo" },
];

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<Aba>("whatsapp");
  const [oauthMsg, setOauthMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (code && state === "facebook") {
      setAba("facebook");
      const redirectUri = `${window.location.origin}/configuracoes`;
      api.oauthFacebook(code, redirectUri)
        .then((res) => {
          setOauthMsg({ ok: true, text: `Ligado à página "${res.facebook_page_name}"${res.instagram_business_account_id ? " + Instagram" : ""}!` });
        })
        .catch((e) => {
          setOauthMsg({ ok: false, text: e.message ?? "Erro ao ligar conta Facebook." });
        })
        .finally(() => {
          router.replace("/configuracoes");
        });
    }
    if (code && state === "google") {
      setAba("email");
      const redirectUri = `${window.location.origin}/configuracoes`;
      api.oauthGoogle(code, redirectUri)
        .then((acc) => {
          setOauthMsg({ ok: true, text: `Gmail ligado: ${acc.email}` });
        })
        .catch((e) => {
          setOauthMsg({ ok: false, text: e.message ?? "Erro ao ligar o Gmail." });
        })
        .finally(() => {
          router.replace("/configuracoes");
        });
    }
  }, []);

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-black/50">Integrações e credenciais da tua empresa</p>
      </header>

      {/* Banner resultado OAuth */}
      {oauthMsg && (
        <div className={`mb-4 flex items-start justify-between rounded-lg border p-3 text-sm ${oauthMsg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          <span>{oauthMsg.ok ? "✓ " : "✗ "}{oauthMsg.text}</span>
          <button type="button" onClick={() => setOauthMsg(null)} className="ml-3 text-black/30 hover:text-black/60">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-black/10 bg-black/3 p-1">
        {ABAS.map((a) => {
          const ativa = aba === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-all ${
                ativa
                  ? "bg-brand font-medium text-white shadow-sm"
                  : "text-black/50 hover:bg-black/5 hover:text-ink"
              }`}
            >
              <div className="text-xs font-semibold">{a.label}</div>
              <div className={`text-[10px] ${ativa ? "text-white/70" : "text-black/40"}`}>{a.sub}</div>
            </button>
          );
        })}
      </div>

      {aba === "whatsapp"  && <AbaWhatsApp />}
      {aba === "discord"   && <AbaDiscord />}
      {aba === "facebook"  && <AbaFacebook />}
      {aba === "instagram" && <AbaInstagram />}
      {aba === "email"     && <AbaEmail />}
    </div>
  );
}

/* ─── Email (Gmail / Agente Executivo) ─────────────────────────────── */
function AbaEmail() {
  const [contas, setContas] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function carregar() {
    api.emailAccounts().then(setContas).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { carregar(); }, []);

  const gmail = contas.find((c) => c.provider === "gmail") ?? null;

  function ligarGmail() {
    const redirectUri = `${window.location.origin}/configuracoes`;
    const url =
      "https://accounts.google.com/o/oauth2/v2/auth" +
      `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(GMAIL_SCOPE)}` +
      "&response_type=code&access_type=offline&prompt=consent&state=google";
    window.location.href = url;
  }

  async function desligar() {
    if (!window.confirm("Desligar a conta de Gmail?")) return;
    await api.desligarEmail("gmail");
    setMsg(null);
    carregar();
  }

  async function sincronizar() {
    setSyncing(true); setMsg(null);
    try {
      const res = await api.sincronizarEmail("gmail");
      setMsg({
        ok: true,
        text: res.n_emails === 0
          ? "Sem emails novos nos últimos 7 dias."
          : `${res.n_emails} email(s) processado(s). Vê o resultado em Agente Executivo.`,
      });
      carregar();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao sincronizar." });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <GuiaEmail />
      </div>
      <div className="col-span-3">
        {msg && (
          <div className={`mb-4 flex items-start justify-between rounded-lg border p-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
            <span>{msg.ok ? "✓ " : "✗ "}{msg.text}</span>
            <button type="button" onClick={() => setMsg(null)} className="ml-3 text-black/30 hover:text-black/60">×</button>
          </div>
        )}
        <div className="rounded-xl border border-black/10 bg-white p-5">
          <p className="mb-1 text-sm font-medium">Ligar a caixa de Gmail</p>
          <p className="mb-3 text-xs text-black/40">
            O Agente Executivo lê os teus emails recentes (só leitura) e resume-os — prioridades,
            ações e decisões. Os tokens são guardados de forma segura, por empresa.
          </p>

          {gmail ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ Gmail ligado: <strong>{gmail.email}</strong>
                {gmail.last_sync && (
                  <span className="ml-2 text-xs text-emerald-700/70">
                    · última sync {new Date(gmail.last_sync).toLocaleString("pt-PT")}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={sincronizar}
                  disabled={syncing}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  {syncing ? "A sincronizar…" : "Sincronizar agora"}
                </button>
                <button
                  type="button"
                  onClick={ligarGmail}
                  className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5"
                >
                  Reconectar
                </button>
                <button
                  type="button"
                  onClick={desligar}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  Desligar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={ligarGmail}
              disabled={!GOOGLE_CLIENT_ID}
              className="flex items-center gap-2 rounded-lg border border-black/20 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-black/5 disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>
              Ligar Gmail
            </button>
          )}
          {!GOOGLE_CLIENT_ID && (
            <p className="mt-2 text-xs text-rose-600">
              Variável NEXT_PUBLIC_GOOGLE_CLIENT_ID não configurada no Vercel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GuiaEmail() {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">Como configurar</p>
      <ol className="space-y-2.5 text-black/70">
        <li><span className="mr-1 font-semibold text-brand">1</span> Cria um projeto em <strong>console.cloud.google.com</strong> e ativa a <strong>Gmail API</strong>.</li>
        <li><span className="mr-1 font-semibold text-brand">2</span> Em <strong>OAuth consent screen</strong>, modo <strong>Testing</strong>, adiciona o teu email como <strong>Test user</strong>.</li>
        <li><span className="mr-1 font-semibold text-brand">3</span> Em <strong>Credentials</strong>, cria um <strong>OAuth client ID</strong> (Web) com o redirect <code className="rounded bg-black/8 px-1">/configuracoes</code> deste domínio.</li>
        <li><span className="mr-1 font-semibold text-brand">4</span> Mete o <strong>Client ID/Secret</strong> no Render e o <strong>Client ID</strong> no Vercel.</li>
        <li><span className="mr-1 font-semibold text-brand">5</span> Clica <strong>Ligar Gmail</strong> e autoriza só-leitura. Depois usa <strong>Sincronizar</strong>.</li>
      </ol>
      <p className="mt-3 text-xs text-black/40">
        O agente só <strong>lê</strong> emails — nunca envia nem apaga. O processamento aparece na página <strong>Agente Executivo</strong>.
      </p>
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
          "Clica em “Ligar WhatsApp” — nós tratamos do resto",
          "Lê o QR Code com o teu telemóvel (WhatsApp › Aparelhos ligados)",
          "Pronto! O Agente SDR começa a responder aos teus leads",
          "Preenche o teu número em “WhatsApp do dono” para receber os relatórios de BI",
          "Tens a tua própria Evolution API? Usa a “Configuração avançada”",
        ]} />
      </div>
      <div className="col-span-3 space-y-4">
        {erro && <Erro msg={erro} />}

        {/* Ligação simples por QR Code (modo gerido) */}
        <WhatsAppGerido />

        {cfg && (
          <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
            <details className="group rounded-lg border border-black/10 bg-paper open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-black/60 [&::-webkit-details-marker]:hidden">
                Configuração avançada (instância manual)
                <span className="text-xs text-black/35 group-open:hidden">mostrar ▾</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 p-3 pt-1">
                <Campo label="Instância do WhatsApp (Evolution)">
                  <input className="campo" value={cfg.whatsapp_instance_name ?? ""}
                    title="Instância do WhatsApp (Evolution)" placeholder="instancia_prod_01"
                    autoComplete="off" name="instancia-whatsapp" data-1p-ignore data-lpignore="true"
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
              </div>
            </details>
            <div className="grid grid-cols-2 gap-4">
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

/* ─── WhatsApp gerido (QR Code, 1 clique) ──────────────────────────── */
function WhatsAppGerido() {
  const [estado, setEstado] = useState<{ gerido: boolean; ligado: boolean; estado: string | null } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [conectando, setConectando] = useState(false);
  const [aguardando, setAguardando] = useState(false); // a aguardar o QR / leitura
  const [erro, setErro] = useState<string | null>(null);

  const carregarEstado = () => api.whatsappEstado().then(setEstado).catch(() => setEstado(null));
  useEffect(() => { carregarEstado(); }, []);

  // Depois de "Ligar", faz polling do QR + estado até o QR aparecer e até ligar.
  // O Baileys pode demorar 15–40s a gerar o QR — por isso esperamos até ~90s.
  useEffect(() => {
    if (!aguardando) return;
    let tentativas = 0;
    const id = setInterval(async () => {
      tentativas += 1;
      const r = await api.whatsappQr().catch(() => null);
      if (r) {
        if (r.qr) setQr(r.qr);
        if (r.ligado) {
          setQr(null);
          setAguardando(false);
          carregarEstado();
          clearInterval(id);
          return;
        }
      }
      if (tentativas >= 36) { // ~90s
        setAguardando(false);
        clearInterval(id);
        setErro("O QR Code demorou demasiado a gerar. Tenta novamente — se persistir, recarrega a página.");
      }
    }, 2500);
    return () => clearInterval(id);
  }, [aguardando]);

  async function conectar() {
    setConectando(true);
    setErro(null);
    setQr(null);
    try {
      const r = await api.whatsappConectar();
      if (r.qr) setQr(r.qr);
      setAguardando(true); // começa o polling do QR/estado
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível iniciar a ligação.");
    } finally {
      setConectando(false);
    }
  }

  async function desligar() {
    if (!window.confirm("Desligar o WhatsApp? Os agentes deixam de responder até voltares a ligar.")) return;
    setQr(null);
    setAguardando(false);
    await api.whatsappDesligar().catch(() => {});
    await carregarEstado();
  }

  if (!estado) return null;

  // Modo manual (servidor central não configurado): não mostra este card.
  if (!estado.gerido) return null;

  const qrSrc = qr ? (qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`) : null;

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-white">
        <span className="text-sm font-semibold">Ligar o teu WhatsApp</span>
        {estado.ligado && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">● Ligado</span>}
      </div>

      <div className="p-5">
        {erro && <div className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</div>}

        {estado.ligado ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-base">✓</span>
              <span><strong>WhatsApp ligado.</strong> O Agente SDR já responde aos teus leads.</span>
            </div>
            <button type="button" onClick={desligar} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
              Desligar
            </button>
          </div>
        ) : qrSrc ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR Code para ligar o WhatsApp" className="h-44 w-44 shrink-0 rounded-lg border border-black/10" />
            <div className="text-sm text-black/60">
              <p className="mb-2 font-medium text-ink">Lê este QR Code com o teu telemóvel:</p>
              <ol className="space-y-1.5 text-[13px]">
                <li>1. Abre o <strong>WhatsApp</strong> no telemóvel</li>
                <li>2. <strong>Definições</strong> → <strong>Aparelhos ligados</strong></li>
                <li>3. <strong>Ligar um aparelho</strong> e aponta a câmara aqui</li>
              </ol>
              <p className="mt-3 flex items-center gap-2 text-xs text-black/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                À espera da leitura… (atualiza sozinho quando ligares)
              </p>
              <button type="button" onClick={conectar} disabled={conectando} className="mt-2 text-xs font-medium text-brand hover:underline disabled:opacity-50">
                Gerar novo QR Code
              </button>
            </div>
          </div>
        ) : aguardando || conectando ? (
          <div className="flex items-center gap-3 py-2">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            <div className="text-sm text-black/60">
              <p className="font-medium text-ink">A gerar o QR Code…</p>
              <p className="text-xs text-black/40">Pode demorar até ~40 segundos. Não feches esta página.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-black/55">
              Liga a tua conta de WhatsApp em segundos — sem instalar nada. Clica e lê um QR Code.
            </p>
            <button
              type="button"
              onClick={conectar}
              disabled={conectando}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {conectando ? "A preparar…" : "Ligar WhatsApp"}
            </button>
          </div>
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

  function ligarFacebook() {
    const redirectUri = `${window.location.origin}/configuracoes`;
    const url = `https://www.facebook.com/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(FB_SCOPES)}&response_type=code&state=facebook`;
    window.location.href = url;
  }

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
        {/* Botão OAuth — ligação automática */}
        <div className="mb-4 rounded-xl border border-black/10 bg-white p-5">
          <p className="text-sm font-medium mb-1">Ligar Facebook & Instagram automaticamente</p>
          <p className="text-xs text-black/40 mb-3">Clica no botão abaixo e autoriza o TeamAgents a gerir as tuas páginas. Os tokens são guardados automaticamente — sem configuração manual.</p>
          {cfg?.facebook_page_id && (
            <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
              ✓ Conta já ligada (Page ID: {cfg.facebook_page_id}). Clica para reconectar se necessário.
            </div>
          )}
          <button
            type="button"
            onClick={ligarFacebook}
            disabled={!FB_APP_ID}
            className="flex items-center gap-2 rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe5] disabled:opacity-40 transition-colors"
          >
            <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Ligar com Facebook
          </button>
          {!FB_APP_ID && <p className="mt-1 text-xs text-rose-600">Variável NEXT_PUBLIC_FACEBOOK_APP_ID não configurada no Vercel.</p>}
        </div>

        {/* Separador */}
        <div className="mb-4 flex items-center gap-3 text-xs text-black/30">
          <div className="h-px flex-1 bg-black/10" />
          <span>ou configuração manual</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

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
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
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
  const [imageUrl, setImageUrl] = useState("");

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
      await api.postarInstagram(
        "🤖 TeamAgents conectado ao Instagram com sucesso! Esta é uma publicação de teste automática.",
        imageUrl.trim() || undefined,
      );
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
          <Campo label="URL da imagem (para publicação de teste)">
            <input className="campo" value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg" />
            <p className="mt-1 text-xs text-black/40">
              O Instagram exige sempre uma imagem. Cola o URL público de um JPEG/PNG acessível.
              Se deixares vazio, é usada uma imagem genérica.
            </p>
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
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
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
        title="Valor secreto da integração"
        // Impede o gestor de passwords do browser de preencher isto com o
        // login do utilizador (não é um campo de password de conta).
        autoComplete="new-password"
        name="token-integracao"
        data-1p-ignore
        data-lpignore="true"
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
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
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
