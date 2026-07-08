"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Config, type EmailAccount, type SocialConfig } from "@/lib/api";
import { useLocale, useT } from "@/components/i18n-context";

const FB_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";
const FB_SCOPES = "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,instagram_manage_insights,public_profile";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

type Aba = "whatsapp" | "discord" | "facebook" | "instagram" | "email";
const ABA_IDS: Aba[] = ["whatsapp", "discord", "facebook", "instagram", "email"];

// Renderiza **negrito** e `código` inline sem markdown pesado.
function Rich({ children }: { children: string }) {
  const parts = children.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="rounded bg-black/8 px-1">{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default function ConfiguracoesPage() {
  const t = useT().configuracoes;
  const [aba, setAba] = useState<Aba>("whatsapp");
  const [oauthMsg, setOauthMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [semCreditos, setSemCreditos] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    api.consumo()
      .then((c) => setSemCreditos(!c.ilimitado && (c.total ?? 0) === 0 && (c.creditos_avulsos ?? 0) === 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const code = params.get("code");
    const state = params.get("state");
    if (code && state === "facebook") {
      setAba("facebook");
      const redirectUri = `${window.location.origin}/configuracoes`;
      api.oauthFacebook(code, redirectUri)
        .then((res) => {
          setOauthMsg({ ok: true, text: `Facebook: "${res.facebook_page_name}"${res.instagram_business_account_id ? " + Instagram" : ""} ✓` });
        })
        .catch((e) => {
          setOauthMsg({ ok: false, text: e.message ?? t.fbErro });
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
          setOauthMsg({ ok: true, text: `${t.gmailConectadoMsg}${acc.email}` });
        })
        .catch((e) => {
          setOauthMsg({ ok: false, text: e.message ?? t.gmailErro });
        })
        .finally(() => {
          router.replace("/configuracoes");
        });
    }
  }, []);

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="text-sm text-black/50">{t.subtitulo}</p>
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
        {ABA_IDS.map((id) => {
          const ativa = aba === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setAba(id)}
              className={`flex-1 rounded-lg px-3 py-2.5 text-center transition-all ${
                ativa
                  ? "bg-brand font-medium text-white shadow-sm"
                  : "text-black/50 hover:bg-black/5 hover:text-ink"
              }`}
            >
              <div className="text-xs font-semibold">{t.abas[id].label}</div>
              <div className={`text-[10px] ${ativa ? "text-white/70" : "text-black/40"}`}>{t.abas[id].sub}</div>
            </button>
          );
        })}
      </div>

      {semCreditos && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <span className="text-sm text-amber-900">
            🔒 <strong>{t.semCreditosStrong}</strong>{t.semCreditosResto}
          </span>
          <Link
            href="/assinatura"
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t.escolherPlano}
          </Link>
        </div>
      )}

      <div className={semCreditos ? "pointer-events-none select-none opacity-50" : ""}>
        {aba === "whatsapp"  && <AbaWhatsApp />}
        {aba === "discord"   && <AbaDiscord />}
        {aba === "facebook"  && <AbaFacebook />}
        {aba === "instagram" && <AbaInstagram />}
        {aba === "email"     && <AbaEmail />}
      </div>
    </div>
  );
}

/* ─── Email (Gmail / Agente Executivo) ─────────────────────────────── */
function AbaEmail() {
  const t = useT().configuracoes;
  const { locale } = useLocale();
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
    if (!window.confirm(t.desligarGmailConfirm)) return;
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
          ? t.semEmailsNovos
          : `${res.n_emails} ${t.emailsProcessados}`,
      });
      carregar();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : t.erroSincronizar });
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
          <p className="mb-1 text-sm font-medium">{t.emailLigar}</p>
          <p className="mb-3 text-xs text-black/40">
            {t.emailDesc}
          </p>

          {gmail ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                ✓ {t.emailConectado} <strong>{gmail.email}</strong>
                {gmail.last_sync && (
                  <span className="ml-2 text-xs text-emerald-700/70">
                    {t.ultimaSync} {new Date(gmail.last_sync).toLocaleString(locale === "en" ? "en-US" : "pt-BR")}
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
                  {syncing ? t.sincronizando : t.sincronizarAgora}
                </button>
                <button
                  type="button"
                  onClick={ligarGmail}
                  className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5"
                >
                  {t.reconectar}
                </button>
                <button
                  type="button"
                  onClick={desligar}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  {t.desligar}
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
              {t.ligarGmail}
            </button>
          )}
          {!GOOGLE_CLIENT_ID && (
            <p className="mt-2 text-xs text-rose-600">
              {t.googleNaoConfig}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GuiaEmail() {
  const t = useT().configuracoes;
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">{t.comoConfigurar}</p>
      <ol className="space-y-2.5 text-black/70">
        {t.guiaEmail.map((s, i) => (
          <li key={i}><span className="mr-1 font-semibold text-brand">{i + 1}</span> <Rich>{s}</Rich></li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-black/40">
        <Rich>{t.guiaEmailNota}</Rich>
      </p>
    </div>
  );
}

/* ─── WhatsApp ─────────────────────────────────────────────────────── */
function AbaWhatsApp() {
  const t = useT().configuracoes;
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [calcomBusy, setCalcomBusy] = useState(false);
  const [calcomMsg, setCalcomMsg] = useState<{ ok: boolean; texto: string } | null>(null);

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
        whatsapp_numero: (cfg.whatsapp_numero ?? "").replace(/\D/g, ""),
        calcom_api_key: cfg.calcom_api_key ?? "",
        calcom_event_type_id: cfg.calcom_event_type_id ?? undefined,
        calendario_link: cfg.calendario_link,
        whatsapp_dono: cfg.whatsapp_dono ?? "",
        limite_mensal_leads: cfg.limite_mensal_leads,
      }));
      setOk(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : t.salvar);
    } finally { setSaving(false); }
  }

  async function verificarCalcom() {
    setCalcomBusy(true);
    setCalcomMsg(null);
    try {
      const r = await api.verificarCalcom();
      setCalcomMsg(r.ok ? { ok: true, texto: t.calcomOk } : { ok: false, texto: r.erro ?? t.calcomFalha });
    } catch (e) {
      setCalcomMsg({ ok: false, texto: e instanceof Error ? e.message : t.calcomFalhaVerif });
    } finally { setCalcomBusy(false); }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <Instrucoes steps={t.waInstrucoes} />
      </div>
      <div className="col-span-3 space-y-4">
        {erro && <Erro msg={erro} />}

        {/* Ligação simples por QR Code (modo gerido) */}
        <WhatsAppGerido />

        {cfg && (
          <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
            <details className="group rounded-lg border border-black/10 bg-paper open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-black/60 [&::-webkit-details-marker]:hidden">
                {t.configAvancada}
                <span className="text-xs text-black/35 group-open:hidden">{t.mostrarSeta}</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 p-3 pt-1">
                <Campo label={t.waInstancia}>
                  <input className="campo" value={cfg.whatsapp_instance_name ?? ""}
                    title={t.waInstancia} placeholder="instancia_prod_01"
                    autoComplete="off" name="instancia-whatsapp" data-1p-ignore data-lpignore="true"
                    onChange={(e) => set("whatsapp_instance_name", e.target.value)} />
                </Campo>
                <Campo label={t.waToken}>
                  <CampoSecreto value={cfg.whatsapp_token ?? ""}
                    onChange={(v) => set("whatsapp_token", v)} />
                </Campo>
                <Campo label={t.waApiUrl} className="col-span-2">
                  <CampoSecreto value={cfg.whatsapp_api_url ?? ""}
                    onChange={(v) => set("whatsapp_api_url", v)}
                    placeholder="https://api.evolution..." />
                </Campo>
              </div>
            </details>
            <div className="grid grid-cols-2 gap-4">
              <Campo label={t.waNumero} className="col-span-2">
                <input className="campo" value={cfg.whatsapp_numero ?? ""}
                  inputMode="numeric"
                  onChange={(e) => set("whatsapp_numero", e.target.value)}
                  placeholder={t.waNumeroPh} />
                <p className="mt-1 text-xs text-black/40">
                  {t.waNumeroNota}
                </p>
              </Campo>
              <Campo label={t.linkCalendario} className="col-span-2">
                <input className="campo" value={cfg.calendario_link ?? ""}
                  onChange={(e) => set("calendario_link", e.target.value)}
                  placeholder="https://cal.com/voce/15min" />
              </Campo>

              {/* Agendamento automático via Cal.com (conta da própria clínica) */}
              <div className="col-span-2 rounded-lg border border-brand/20 bg-brand/[0.03] p-3">
                <div className="mb-1 text-sm font-semibold text-ink">{t.calcomTitulo}</div>
                <p className="mb-3 text-xs leading-relaxed text-black/50">
                  {t.calcomDescA}<strong>{t.calcomDescSua}</strong>{t.calcomDescB}<strong>{t.calcomDescMarcar}</strong>{t.calcomDescC}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label={t.calcomApiKey} className="col-span-2">
                    <CampoSecreto value={cfg.calcom_api_key ?? ""}
                      onChange={(v) => set("calcom_api_key", v)}
                      placeholder="cal_live_..." />
                  </Campo>
                  <Campo label={t.calcomEventType}>
                    <input type="number" className="campo" value={cfg.calcom_event_type_id ?? ""}
                      onChange={(e) => set("calcom_event_type_id", e.target.value ? Number(e.target.value) : null)}
                      placeholder={t.calcomEventTypePh} />
                  </Campo>
                  <div className="flex items-end">
                    <button type="button" onClick={verificarCalcom} disabled={calcomBusy}
                      className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40">
                      {calcomBusy ? t.verificando : t.verificarConexao}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-black/40">
                  {t.calcomNotaA}
                  <strong>{t.calcomNotaSalve}</strong>
                </p>
                {calcomMsg && (
                  <p className={`mt-2 text-xs ${calcomMsg.ok ? "text-emerald-700" : "text-rose-700"}`}>
                    {calcomMsg.ok ? "✓ " : "✗ "}{calcomMsg.texto}
                  </p>
                )}
              </div>
              <Campo label={t.waDono}>
                <input className="campo" value={cfg.whatsapp_dono ?? ""}
                  onChange={(e) => set("whatsapp_dono", e.target.value)}
                  placeholder="+5511999999999" />
              </Campo>
              <Campo label={t.limiteLeads}>
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
  const t = useT().configuracoes;
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
        setErro(t.qrDemorou);
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
      setErro(e instanceof Error ? e.message : t.erroIniciarConexao);
    } finally {
      setConectando(false);
    }
  }

  async function desligar() {
    if (!window.confirm(t.desligarWaConfirm)) return;
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
        <span className="text-sm font-semibold">{t.ligarSeuWa}</span>
        {estado.ligado && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium">{t.ligado}</span>}
      </div>

      <div className="p-5">
        {erro && <div className="mb-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</div>}

        {estado.ligado ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-base">✓</span>
              <span><strong>{t.waLigadoStrong}</strong>{t.waLigadoResto}</span>
            </div>
            <button type="button" onClick={desligar} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50">
              {t.desligar}
            </button>
          </div>
        ) : qrSrc ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt={t.qrAlt} className="h-44 w-44 shrink-0 rounded-lg border border-black/10" />
            <div className="text-sm text-black/60">
              <p className="mb-2 font-medium text-ink">{t.lerQr}</p>
              <ol className="space-y-1.5 text-[13px]">
                <li><Rich>{t.qrPasso1}</Rich></li>
                <li><Rich>{t.qrPasso2}</Rich></li>
                <li><Rich>{t.qrPasso3}</Rich></li>
              </ol>
              <p className="mt-3 flex items-center gap-2 text-xs text-black/40">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {t.aguardandoLeitura}
              </p>
              <button type="button" onClick={conectar} disabled={conectando} className="mt-2 text-xs font-medium text-brand hover:underline disabled:opacity-50">
                {t.gerarNovoQr}
              </button>
            </div>
          </div>
        ) : aguardando || conectando ? (
          <div className="flex items-center gap-3 py-2">
            <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            <div className="text-sm text-black/60">
              <p className="font-medium text-ink">{t.gerandoQr}</p>
              <p className="text-xs text-black/40">{t.gerandoQrNota}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-black/55">
              {t.conecteWaDesc}
            </p>
            <button
              type="button"
              onClick={conectar}
              disabled={conectando}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {conectando ? t.preparando : t.ligarWa}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Discord ──────────────────────────────────────────────────────── */
function AbaDiscord() {
  const t = useT().configuracoes;
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
      setErro(err instanceof Error ? err.message : t.salvar);
    } finally { setSaving(false); }
  }

  async function testar() {
    setTestando(true); setErroTeste(null); setTesteOk(false);
    try {
      await api.testarDiscord();
      setTesteOk(true);
    } catch (err) {
      setErroTeste(err instanceof Error ? err.message : t.erroTeste);
    } finally { setTestando(false); }
  }

  if (loading) return <Carregando />;

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="col-span-2">
        <Instrucoes steps={t.discordInstrucoes} />
      </div>
      <div className="col-span-3">
        {erro && <Erro msg={erro} />}
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label={t.discordWebhook}>
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
              {testando ? t.testando : t.testarConexao}
            </button>
          </div>
          {testeOk && <p className="text-sm text-emerald-700">{t.discordTesteOk}</p>}
          {erroTeste && <Erro msg={erroTeste} />}
        </form>
      </div>
    </div>
  );
}

/* ─── Facebook ─────────────────────────────────────────────────────── */
function AbaFacebook() {
  const t = useT().configuracoes;
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
      setErro(err instanceof Error ? err.message : t.salvar);
    } finally { setSaving(false); }
  }

  async function verificar() {
    setVerificando(true); setErroVerif(null); setPaginaInfo(null);
    try {
      setPaginaInfo(await api.verificarFacebook());
    } catch (err) {
      setErroVerif(err instanceof Error ? err.message : t.fbTokenInvalido);
    } finally { setVerificando(false); }
  }

  async function publicarTeste() {
    setPublicando(true); setErroPublicacao(null); setPublicacaoOk(false);
    try {
      await api.postarFacebook(t.fbTestePost);
      setPublicacaoOk(true);
    } catch (err) {
      setErroPublicacao(err instanceof Error ? err.message : t.erroPublicar);
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
      setErroTroca(err instanceof Error ? err.message : t.erroTrocarToken);
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
          <p className="text-sm font-medium mb-1">{t.fbLigarAuto}</p>
          <p className="text-xs text-black/40 mb-3">{t.fbLigarAutoDesc}</p>
          {cfg?.facebook_page_id && (
            <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
              {t.fbJaConectadoA}{cfg.facebook_page_id}{t.fbJaConectadoB}
            </div>
          )}
          <button
            type="button"
            onClick={ligarFacebook}
            disabled={!FB_APP_ID}
            className="flex items-center gap-2 rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166fe5] disabled:opacity-40 transition-colors"
          >
            <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            {t.fbLigarBtn}
          </button>
          {!FB_APP_ID && <p className="mt-1 text-xs text-rose-600">{t.fbNaoConfig}</p>}
        </div>

        {/* Separador */}
        <div className="mb-4 flex items-center gap-3 text-xs text-black/30">
          <div className="h-px flex-1 bg-black/10" />
          <span>{t.ouConfigManual}</span>
          <div className="h-px flex-1 bg-black/10" />
        </div>

        {erro && <Erro msg={erro} />}
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label={t.fbPageId}>
            <CampoSecreto
              value={cfg?.facebook_page_id ?? ""}
              onChange={(v) => set("facebook_page_id", v)}
              placeholder="123456789012345"
            />
          </Campo>
          <Campo label={t.fbPageToken}>
            <CampoSecreto
              value={cfg?.facebook_page_access_token ?? ""}
              onChange={(v) => set("facebook_page_access_token", v)}
              placeholder="EAAb..."
            />
            <p className="mt-1 text-xs text-black/40">{t.fbPageTokenNota}</p>
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={verificar}
              disabled={verificando || !cfg?.facebook_page_id || !cfg?.facebook_page_access_token}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {verificando ? t.verificando : t.verificarCredenciais}
            </button>
            <button type="button" onClick={publicarTeste}
              disabled={publicando || !cfg?.facebook_page_id || !cfg?.facebook_page_access_token}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {publicando ? t.publicando : t.publicacaoTeste}
            </button>
          </div>
          {paginaInfo && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {t.fbConectadoPagina} <strong>{paginaInfo.name}</strong>
            </div>
          )}
          {erroVerif && <Erro msg={erroVerif} />}
          {publicacaoOk && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {t.fbPubTesteOk}
            </div>
          )}
          {erroPublicacao && <Erro msg={erroPublicacao} />}
        </form>

        {/* Renovação de token */}
        <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 space-y-3">
          <div>
            <p className="text-sm font-medium">{t.renovarToken}</p>
            <p className="text-xs text-black/40 mt-0.5">{t.renovarTokenDesc}</p>
          </div>
          <CampoSecreto value={userToken} onChange={setUserToken} placeholder={t.userTokenPh} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={trocarToken}
              disabled={trocando || !userToken.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
              {trocando ? t.trocando : t.converter60}
            </button>
          </div>
          {trocaOk && <p className="text-sm text-emerald-700">{t.tokenLongoSalvoA}<strong>{trocaOk}</strong>{t.tokenLongoSalvoB}</p>}
          {erroTroca && <Erro msg={erroTroca} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Instagram ────────────────────────────────────────────────────── */
function AbaInstagram() {
  const t = useT().configuracoes;
  const { locale } = useLocale();
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
      setErro(err instanceof Error ? err.message : t.salvar);
    } finally { setSaving(false); }
  }

  async function verificar() {
    setVerificando(true); setErroVerif(null); setIgInfo(null);
    try {
      setIgInfo(await api.verificarInstagram());
    } catch (err) {
      setErroVerif(err instanceof Error ? err.message : t.igIdIncorreto);
    } finally { setVerificando(false); }
  }

  async function publicarTeste() {
    setPublicando(true); setErroPublicacao(null); setPublicacaoOk(false);
    try {
      await api.postarInstagram(
        t.igTestePost,
        imageUrl.trim() || undefined,
      );
      setPublicacaoOk(true);
    } catch (err) {
      setErroPublicacao(err instanceof Error ? err.message : t.erroPublicar);
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
            {t.igAvisoFbA}<strong>{t.igAvisoFbStrong}</strong>{t.igAvisoFbB}
          </div>
        )}
        {erro && <Erro msg={erro} />}
        <form onSubmit={salvar} className="space-y-4 rounded-xl border border-black/10 bg-white p-5">
          <Campo label={t.igAccountId}>
            <input className="campo" value={cfg?.instagram_business_account_id ?? ""}
              onChange={(e) => setCfg((c) => c ? { ...c, instagram_business_account_id: e.target.value } : c)}
              placeholder="17841400000000000" />
            <p className="mt-1 text-xs text-black/40">{t.igAccountIdNota}</p>
          </Campo>
          <Campo label={t.igImageUrl}>
            <input className="campo" value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg" />
            <p className="mt-1 text-xs text-black/40">
              {t.igImageUrlNota}
            </p>
          </Campo>
          <div className="flex flex-wrap items-center gap-3">
            <BotaoGuardar saving={saving} ok={ok} />
            <button type="button" onClick={verificar}
              disabled={verificando || !cfg?.instagram_business_account_id || !temFbToken}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {verificando ? t.verificando : t.verificarConta}
            </button>
            <button type="button" onClick={publicarTeste}
              disabled={publicando || !cfg?.instagram_business_account_id || !temFbToken}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40 transition-colors">
              {publicando ? t.publicando : t.publicacaoTeste}
            </button>
          </div>
          {igInfo && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {t.igConectadoA} <strong>@{igInfo.username}</strong> · {igInfo.name}
              {igInfo.followers_count !== undefined && ` · ${igInfo.followers_count.toLocaleString(locale === "en" ? "en-US" : "pt-BR")} ${t.igSeguidoresSuf}`}
            </div>
          )}
          {erroVerif && <Erro msg={erroVerif} />}
          {publicacaoOk && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
              {t.igPubTesteOk}{igInfo?.username ?? "bitzensoftware"}.
            </div>
          )}
          {erroPublicacao && <Erro msg={erroPublicacao} />}
        </form>
      </div>
    </div>
  );
}

/* ─── Guias Meta (Facebook / Instagram) — conteúdo no dicionário ────── */
function GuiaMeta({ passos }: { passos: { t: string; linhas: string[] }[] }) {
  const t = useT().configuracoes;
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-xl border border-black/8 bg-black/2 p-4 text-xs text-black/60">
      <button type="button" onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between font-semibold uppercase tracking-wide text-black/40 hover:text-black/60 transition-colors">
        <span>{t.guiaConfig}</span>
        <span>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && (
        <div className="mt-4 space-y-4">
          {passos.map((p, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">{i + 1}</span>
              <div>
                <p className="font-semibold text-black/70 mb-1">{p.t}</p>
                {p.linhas.map((l, j) => (
                  <p key={j} className={j > 0 ? "mt-1" : ""}><Rich>{l}</Rich></p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuiaFacebook() {
  const t = useT().configuracoes;
  return <GuiaMeta passos={t.passosGuiaFb} />;
}

function GuiaInstagram() {
  const t = useT().configuracoes;
  return <GuiaMeta passos={t.passosGuiaIg} />;
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
  const t = useT().configuracoes;
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
        title={t.valorSecreto}
        // Impede o gerenciador de senhas do navegador de preencher isto com o
        // login do usuário (não é um campo de senha de conta).
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
          title={t.copiar}
        >
          {copiado ? "✓" : t.copiar}
        </button>
        <span className="text-black/15">|</span>
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="rounded px-2 py-1 text-xs text-black/40 hover:bg-black/5 hover:text-ink transition-colors"
        >
          {visivel ? t.ocultar : t.mostrar}
        </button>
      </div>
    </div>
  );
}

function BotaoGuardar({ saving, ok }: { saving: boolean; ok: boolean }) {
  const t = useT().configuracoes;
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={saving}
        className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
        {saving ? t.salvando : t.salvar}
      </button>
      {ok && <span className="text-sm text-emerald-700">{t.salvo}</span>}
    </div>
  );
}

function Erro({ msg }: { msg: string }) {
  return <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{msg}</p>;
}

function Carregando() {
  const t = useT().configuracoes;
  return <p className="text-sm text-black/40">{t.carregando}</p>;
}

function Instrucoes({ steps }: { steps: string[] }) {
  const t = useT().configuracoes;
  return (
    <div className="rounded-xl border border-black/8 bg-black/2 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">{t.comoConfigurar}</p>
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
