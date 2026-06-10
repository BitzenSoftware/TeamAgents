"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Consumo, type PacoteAtivo, type PlanoAtivo } from "@/lib/api";

export default function AssinaturaPage() {
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  const [planos, setPlanos] = useState<PlanoAtivo[]>([]);
  const [pacotes, setPacotes] = useState<PacoteAtivo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const recarregarConsumo = useCallback(() => {
    api.consumo().then(setConsumo).catch(() => {});
  }, []);

  useEffect(() => {
    recarregarConsumo();
    api.planosAtivos().then(setPlanos).catch(() => {});
    api.pacotesAtivos().then(setPacotes).catch(() => {});
    // Banner de retorno do Checkout/compra
    const q = new URLSearchParams(window.location.search);
    if (q.get("assinatura") === "sucesso") setAviso("Assinatura concluída! Pode demorar uns segundos a refletir.");
    else if (q.get("compra") === "sucesso") setAviso("Compra concluída! Os créditos entram em instantes.");
    else if (q.get("assinatura") === "cancelado" || q.get("compra") === "cancelado") setAviso("Operação cancelada — nada foi cobrado.");
  }, [recarregarConsumo]);

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
      setErro(e instanceof Error ? e.message : "Não foi possível mudar de plano.");
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
      setErro(e instanceof Error ? e.message : "Não foi possível abrir a compra.");
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
      setErro(e instanceof Error ? e.message : "Não foi possível abrir o portal de pagamento.");
      setBusy(null);
    }
  }

  async function cancelar() {
    if (!confirm("Cancelar a assinatura? Mantens o acesso até ao fim do período já pago; depois não renova.")) return;
    setErro(null);
    setBusy("cancel");
    try {
      await api.cancelarAssinatura();
      recarregarConsumo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível cancelar.");
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
      setErro(e instanceof Error ? e.message : "Não foi possível reativar.");
    } finally {
      setBusy(null);
    }
  }

  function rotuloPlano(p: PlanoAtivo): { label: string; tipo: "atual" | "upgrade" | "downgrade" | "assinar" | "indisponivel" } {
    if (!p.stripe_price_id) return { label: "Indisponível", tipo: "indisponivel" };
    if (p.id === planoAtualId) return { label: "Plano atual", tipo: "atual" };
    if (!temAssinatura) return { label: "Assinar", tipo: "assinar" };
    return p.creditos_mensais > creditosAtuais
      ? { label: "Upgrade", tipo: "upgrade" }
      : { label: "Downgrade", tipo: "downgrade" };
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Assinatura</h1>
        <p className="mt-1 text-sm text-black/50">
          Faz upgrade/downgrade do teu plano e compra pacotes de créditos avulsos.
        </p>
      </header>

      {consumo?.pagamento_em_falha && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
          <span className="text-sm text-rose-800">
            <strong>O último pagamento falhou.</strong> Verifica o teu método de pagamento e tenta novamente
            para não perderes o acesso aos agentes.
          </span>
          {consumo.tem_assinatura && (
            <button
              type="button"
              onClick={gerirAssinatura}
              disabled={busy === "portal"}
              className="shrink-0 rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy === "portal" ? "A abrir…" : "Atualizar pagamento"}
            </button>
          )}
        </div>
      )}
      {consumo && !consumo.pagamento_em_falha && consumo.sem_plano && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Ainda não tens um plano ativo.</strong> Escolhe um plano abaixo e conclui o pagamento —
          os créditos são libertados assim que o pagamento for confirmado.
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
            Planos
            {consumo?.plano_nome && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-normal">
                Atual: {consumo.plano_nome}
              </span>
            )}
          </span>
          {temAssinatura && (
            <div className="flex items-center gap-2">
              {consumo?.assinatura_cancela_em ? (
                <>
                  <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[11px] font-medium text-amber-950">
                    Cancela em {fmtData(consumo.assinatura_cancela_em)}
                  </span>
                  <button
                    type="button"
                    onClick={reativar}
                    disabled={busy === "react"}
                    className="rounded-lg bg-white px-3 py-1 text-xs font-medium text-brand hover:bg-white/90 disabled:opacity-50"
                  >
                    {busy === "react" ? "A reativar…" : "Reativar assinatura"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={busy === "cancel"}
                  className="rounded-lg bg-rose-500/90 px-3 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  {busy === "cancel" ? "A cancelar…" : "Cancelar assinatura"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-4">
          {planos.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/40">Sem planos disponíveis.</p>
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
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      R$ {Number(p.preco).toFixed(2)}
                      <span className="text-sm font-normal text-black/40"> /mês</span>
                    </div>
                    <div className="mt-0.5 text-xs text-black/50">
                      {p.creditos_mensais.toLocaleString("pt-BR")} créditos/mês
                    </div>
                    <button
                      type="button"
                      onClick={() => escolherPlano(p)}
                      disabled={bloq || busy === `plano-${p.id}`}
                      className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-40 ${cor}`}
                    >
                      {busy === `plano-${p.id}` ? "A processar…" : r.label}
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
              Pacotes de créditos avulsos
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-normal">
                Saldo: {consumo?.creditos_avulsos ?? 0}
              </span>
            </span>
            <span className="text-[11px] text-white/70">Compra única · ilimitada · não expiram · usados após a mesada do plano</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pacotes.map((p) => {
                const semStripe = !p.stripe_price_id;
                return (
                  <div key={p.id} className="flex flex-col rounded-xl border border-black/10 p-4">
                    <span className="font-semibold">{p.nome}</span>
                    <div className="mt-1 text-2xl font-semibold">
                      R$ {Number(p.preco).toFixed(2)}
                      <span className="text-sm font-normal text-black/40"> única</span>
                    </div>
                    <div className="mt-0.5 text-xs text-black/50">+{p.creditos.toLocaleString("pt-BR")} créditos</div>
                    <button
                      type="button"
                      onClick={() => comprar(p)}
                      disabled={semStripe || busy === `pac-${p.id}`}
                      title={semStripe ? "Pacote ainda não disponível para compra." : undefined}
                      className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      {busy === `pac-${p.id}` ? "A abrir…" : semStripe ? "Indisponível" : "Comprar"}
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

function fmtData(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
