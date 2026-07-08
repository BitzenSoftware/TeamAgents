"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Consumo, type PacoteAtivo, type PlanoAtivo } from "@/lib/api";
import { useLocale, useT } from "@/components/i18n-context";
import { readCurrencyClient } from "@/lib/i18n/locale";

export default function AssinaturaPage() {
  const t = useT().assinatura;
  const { locale } = useLocale();
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  const [planos, setPlanos] = useState<PlanoAtivo[]>([]);
  const [pacotes, setPacotes] = useState<PacoteAtivo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Moeda por país (cookie definido pelo middleware): BR→BRL, resto→USD.
  const [simbolo, setSimbolo] = useState("R$");

  const recarregarConsumo = useCallback(() => {
    api.consumo().then(setConsumo).catch(() => {});
  }, []);

  useEffect(() => {
    const moeda = readCurrencyClient();
    setSimbolo(moeda === "usd" ? "$" : "R$");
    recarregarConsumo();
    api.planosAtivos(moeda).then(setPlanos).catch(() => {});
    api.pacotesAtivos(moeda).then(setPacotes).catch(() => {});
    // Banner de retorno do Checkout/compra
    const q = new URLSearchParams(window.location.search);
    if (q.get("assinatura") === "sucesso") setAviso(t.avisoAssinaturaSucesso);
    else if (q.get("compra") === "sucesso") setAviso(t.avisoCompraSucesso);
    else if (q.get("assinatura") === "cancelado" || q.get("compra") === "cancelado") setAviso(t.avisoCancelada);
  }, [recarregarConsumo, t]);

  const temAssinatura = !!consumo?.tem_assinatura;
  const planoAtualId = consumo?.plano_id ?? null;
  const creditosAtuais = consumo?.total ?? 0;

  async function escolherPlano(p: PlanoAtivo) {
    setErro(null);
    setBusy(`plano-${p.id}`);
    try {
      if (temAssinatura) {
        await api.mudarPlano(p.id); // upgrade/downgrade in-app
        recarregarConsumo();
        setBusy(null);
      } else {
        const { url } = await api.checkout(p.id); // primeira subscrição
        window.location.href = url;
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroMudarPlano);
      setBusy(null);
    }
  }

  async function comprar(p: PacoteAtivo) {
    setErro(null);
    setBusy(`pac-${p.id}`);
    try {
      const { url } = await api.comprarCreditos(p.id);
      window.location.href = url;
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroAbrirCompra);
      setBusy(null);
    }
  }

  async function gerirAssinatura() {
    setErro(null);
    setBusy("portal");
    try {
      const { url } = await api.portal();
      window.location.href = url;
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroAbrirPortal);
      setBusy(null);
    }
  }

  async function cancelar() {
    if (!confirm(t.confirmarCancelar)) return;
    setErro(null);
    setBusy("cancel");
    try {
      await api.cancelarAssinatura();
      recarregarConsumo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroCancelar);
    } finally {
      setBusy(null);
    }
  }

  async function reativar() {
    setErro(null);
    setBusy("react");
    try {
      await api.reativarAssinatura();
      recarregarConsumo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroReativar);
    } finally {
      setBusy(null);
    }
  }

  function rotuloPlano(p: PlanoAtivo): { label: string; tipo: "atual" | "upgrade" | "downgrade" | "assinar" | "indisponivel" } {
    if (!p.stripe_price_id) return { label: t.lblIndisponivel, tipo: "indisponivel" };
    if (p.id === planoAtualId) return { label: t.lblPlanoAtual, tipo: "atual" };
    if (!temAssinatura) return { label: t.lblAssinar, tipo: "assinar" };
    return p.creditos_mensais > creditosAtuais
      ? { label: t.lblUpgrade, tipo: "upgrade" }
      : { label: t.lblDowngrade, tipo: "downgrade" };
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 text-sm text-black/50">
          {t.subtitulo}
        </p>
      </header>

      {consumo?.pagamento_em_falha && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <span className="text-sm text-rose-800">
            <strong>{t.pagamentoFalhaStrong}</strong>{t.pagamentoFalhaResto}
          </span>
          {consumo.tem_assinatura && (
            <button
              type="button"
              onClick={gerirAssinatura}
              disabled={busy === "portal"}
              className="shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === "portal" ? t.abrindo : t.atualizarPagamento}
            </button>
          )}
        </div>
      )}
      {consumo && !consumo.pagamento_em_falha && consumo.sem_plano && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>{t.semPlanoStrong}</strong>{t.semPlanoResto}
        </p>
      )}
      {aviso && (
        <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{aviso}</p>
      )}
      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {/* Planos */}
      <section className="mb-6 overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-white">
          <span className="text-xs font-semibold">
            {t.planos}
            {consumo?.plano_nome && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-normal">
                {t.atualPre} {consumo.plano_nome}
              </span>
            )}
          </span>
          {temAssinatura && (
            <div className="flex items-center gap-2">
              {consumo?.assinatura_cancela_em ? (
                <>
                  <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-medium text-amber-950">
                    {t.cancelaEm} {fmtData(consumo.assinatura_cancela_em, locale)}
                  </span>
                  <button
                    type="button"
                    onClick={reativar}
                    disabled={busy === "react"}
                    className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-brand hover:bg-white/90 disabled:opacity-50"
                  >
                    {busy === "react" ? t.reativando : t.reativarAssinatura}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={busy === "cancel"}
                  className="rounded-lg bg-rose-500/90 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {busy === "cancel" ? t.cancelando : t.cancelarAssinatura}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-4">
          {planos.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/40">{t.semPlanos}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planos.map((p) => {
                const r = rotuloPlano(p);
                const atual = r.tipo === "atual";
                const bloq = r.tipo === "atual" || r.tipo === "indisponivel";
                const cor =
                  r.tipo === "upgrade"
                    ? "bg-brand hover:opacity-90"
                    : r.tipo === "downgrade"
                    ? "bg-slate-600 hover:opacity-90"
                    : r.tipo === "assinar"
                    ? "bg-brand hover:opacity-90"
                    : "bg-black/30";
                return (
                  <div
                    key={p.id}
                    className={`flex flex-col rounded-xl border p-4 ${
                      atual ? "border-brand/50 bg-brand/5" : "border-black/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{p.nome}</span>
                      {atual && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                          {t.atualBadge}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {simbolo} {Number(p.preco).toFixed(2)}
                      <span className="text-sm font-normal text-black/40"> {t.porMes}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-black/50">
                      {p.creditos_mensais.toLocaleString(locale === "en" ? "en-US" : "pt-BR")} {t.creditosMes}
                    </div>
                    <button
                      type="button"
                      onClick={() => escolherPlano(p)}
                      disabled={bloq || busy === `plano-${p.id}`}
                      className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40 ${cor}`}
                    >
                      {busy === `plano-${p.id}` ? t.processando : r.label}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Pacotes avulsos */}
      {pacotes.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-white">
            <span className="text-xs font-semibold">
              {t.pacotesTitulo}
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-normal">
                {t.saldo} {consumo?.creditos_avulsos ?? 0}
              </span>
            </span>
            <span className="text-[11px] text-white/70">{t.pacotesNota}</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pacotes.map((p) => {
                const semStripe = !p.stripe_price_id;
                return (
                  <div key={p.id} className="flex flex-col rounded-xl border border-black/10 p-4">
                    <span className="font-semibold">{p.nome}</span>
                    <div className="mt-1 text-2xl font-semibold">
                      {simbolo} {Number(p.preco).toFixed(2)}
                      <span className="text-sm font-normal text-black/40"> {t.unica}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-black/50">+{p.creditos.toLocaleString(locale === "en" ? "en-US" : "pt-BR")} {t.creditos}</div>
                    <button
                      type="button"
                      onClick={() => comprar(p)}
                      disabled={semStripe || busy === `pac-${p.id}`}
                      title={semStripe ? t.pacoteIndispTitle : undefined}
                      className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      {busy === `pac-${p.id}` ? t.abrindo : semStripe ? t.indisponivelBtn : t.comprar}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function fmtData(iso: string, locale: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
