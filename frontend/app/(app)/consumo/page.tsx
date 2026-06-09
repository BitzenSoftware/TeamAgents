"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Consumo, type ConsumoDashboard, type PacoteAtivo, type PlanoAtivo } from "@/lib/api";

type Gran = "dia" | "semana" | "mes" | "ano";

const GRAN_TABS: { id: Gran; label: string }[] = [
  { id: "dia", label: "Diário" },
  { id: "semana", label: "Semanal" },
  { id: "mes", label: "Mensal" },
  { id: "ano", label: "Anual" },
];

// Origem → rótulo amigável + cor
const ORIGEM: Record<string, { label: string; cor: string }> = {
  campanhas: { label: "Campanhas (Copywriting)", cor: "#4f46e5" },
  sdr: { label: "SDR (WhatsApp)", cor: "#16a34a" },
  bi: { label: "Diretor de BI", cor: "#d97706" },
  executivo: { label: "Agente Executivo (Email)", cor: "#db2777" },
  outro: { label: "Outro", cor: "#64748b" },
};

export default function ConsumoPage() {
  const anoAtual = new Date().getFullYear();
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  const [dash, setDash] = useState<ConsumoDashboard | null>(null);
  const [gran, setGran] = useState<Gran>("mes");
  const [ano, setAno] = useState(anoAtual);
  const [loading, setLoading] = useState(false);
  const [planos, setPlanos] = useState<PlanoAtivo[]>([]);
  const [pacotes, setPacotes] = useState<PacoteAtivo[]>([]);
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [billingErro, setBillingErro] = useState<string | null>(null);

  const anos = useMemo(() => Array.from({ length: 4 }, (_, i) => anoAtual - i), [anoAtual]);

  useEffect(() => {
    api.consumo().then(setConsumo).catch(() => {});
    api.planosAtivos().then(setPlanos).catch(() => {});
    api.pacotesAtivos().then(setPacotes).catch(() => {});
  }, []);

  async function comprar(pacoteId: string) {
    setBillingBusy(`pac-${pacoteId}`);
    setBillingErro(null);
    try {
      const { url } = await api.comprarCreditos(pacoteId);
      window.location.href = url;
    } catch (e) {
      setBillingErro(e instanceof Error ? e.message : "Não foi possível abrir a compra.");
      setBillingBusy(null);
    }
  }

  async function assinar(planoId: string) {
    setBillingBusy(planoId);
    setBillingErro(null);
    try {
      const { url } = await api.checkout(planoId);
      window.location.href = url;
    } catch (e) {
      setBillingErro(e instanceof Error ? e.message : "Não foi possível abrir o checkout.");
      setBillingBusy(null);
    }
  }

  async function gerirAssinatura() {
    setBillingBusy("portal");
    setBillingErro(null);
    try {
      const { url } = await api.portal();
      window.location.href = url;
    } catch (e) {
      setBillingErro(e instanceof Error ? e.message : "Não foi possível abrir o portal.");
      setBillingBusy(null);
    }
  }

  const carregar = useCallback(() => {
    setLoading(true);
    // Para "ano" mostramos todos os anos; para dia/semana/mês, o ano selecionado.
    const de = gran === "ano" ? "2000-01-01" : `${ano}-01-01`;
    const ate = gran === "ano" ? `${anoAtual}-12-31` : `${ano}-12-31`;
    api
      .consumoDashboard(de, ate, gran)
      .then(setDash)
      .catch(() => setDash(null))
      .finally(() => setLoading(false));
  }, [gran, ano, anoAtual]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const series = dash?.series ?? [];
  const maxV = Math.max(1, ...series.map((s) => s.total));
  const origens = Object.entries(dash?.por_origem ?? {}).sort((a, b) => b[1] - a[1]);
  const totalOrigem = origens.reduce((acc, [, v]) => acc + v, 0) || 1;

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Consumo de Créditos</h1>
        <p className="mt-1 text-sm text-black/50">
          Acompanha o consumo do plano e vê onde os créditos são gastos, por período e por agente.
        </p>
      </header>

      {/* KPIs do plano (mês atual) */}
      {consumo && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CardKpi titulo="Créditos usados (mês)" valor={`${consumo.usados}`} sub={`/ ${consumo.total}`} />
          <CardKpi
            titulo="Disponíveis"
            valor={`${consumo.disponivel_total ?? consumo.restantes}`}
            sub={
              consumo.creditos_avulsos
                ? `(${consumo.restantes} do plano + ${consumo.creditos_avulsos} avulsos)`
                : undefined
            }
          />
          <CardKpiBar titulo="Uso do plano" percent={consumo.percent} />
        </div>
      )}

      {/* Plano & assinatura */}
      {planos.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-white">
            <span className="text-xs font-semibold">
              Plano & assinatura
              {consumo?.plano_nome && (
                <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-normal">
                  Atual: {consumo.plano_nome}
                </span>
              )}
            </span>
            {consumo?.tem_assinatura && (
              <button
                type="button"
                onClick={gerirAssinatura}
                disabled={billingBusy === "portal"}
                className="rounded-lg bg-white/15 px-3 py-1 text-xs font-medium text-white hover:bg-white/25 disabled:opacity-50"
              >
                {billingBusy === "portal" ? "A abrir…" : "Gerir assinatura"}
              </button>
            )}
          </div>
          <div className="p-4">
            {billingErro && (
              <p className="mb-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{billingErro}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planos.map((p) => {
                const atual = p.id === consumo?.plano_id;
                const semStripe = !p.stripe_price_id;
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
                          Plano atual
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
                      onClick={() => assinar(p.id)}
                      disabled={atual || semStripe || billingBusy === p.id}
                      title={semStripe ? "Plano ainda não disponível para assinatura." : undefined}
                      className="mt-3 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      {atual ? "Plano atual" : billingBusy === p.id ? "A abrir…" : semStripe ? "Indisponível" : "Assinar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comprar créditos avulsos (top-ups) */}
      {pacotes.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-white">
            <span className="text-xs font-semibold">
              Comprar créditos avulsos
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-normal">
                Saldo: {consumo?.creditos_avulsos ?? 0}
              </span>
            </span>
            <span className="text-[11px] text-white/70">Compra única · não expiram · usados após a mesada do plano</span>
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
                    <div className="mt-0.5 text-xs text-black/50">
                      +{p.creditos.toLocaleString("pt-BR")} créditos
                    </div>
                    <button
                      type="button"
                      onClick={() => comprar(p.id)}
                      disabled={semStripe || billingBusy === `pac-${p.id}`}
                      title={semStripe ? "Pacote ainda não disponível para compra." : undefined}
                      className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      {billingBusy === `pac-${p.id}` ? "A abrir…" : semStripe ? "Indisponível" : "Comprar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Controlos */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-black/10 bg-white p-1">
          {GRAN_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setGran(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                gran === t.id ? "bg-brand text-white" : "text-black/55 hover:bg-black/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {gran !== "ano" && (
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            aria-label="Ano"
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          >
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-sm text-black/50">
          Total no período: <strong className="text-ink">{dash?.total ?? 0}</strong> créditos
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gráfico de barras (série temporal) */}
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white lg:col-span-2">
          <div className="bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-xs font-semibold text-white">
            Consumo por {GRAN_TABS.find((t) => t.id === gran)?.label.toLowerCase()}
          </div>
          <div className="p-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-black/40">A carregar…</p>
            ) : series.length === 0 ? (
              <p className="py-10 text-center text-sm text-black/40">
                Sem consumo registado neste período. Os gráficos vão preenchendo à medida que os agentes
                trabalham.
              </p>
            ) : (
              <div className="flex h-56 items-end gap-1 overflow-x-auto">
                {series.map((s) => (
                  <div key={s.bucket} className="flex min-w-[28px] flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px] text-black/50">{s.total}</span>
                    <div
                      className="w-full rounded-t bg-brand transition-all"
                      style={{ height: `${(s.total / maxV) * 100}%`, minHeight: s.total > 0 ? "4px" : "0" }}
                      title={`${s.bucket}: ${s.total}`}
                    />
                    <span className="w-full truncate text-center text-[9px] text-black/40" title={s.bucket}>
                      {rotuloBucket(s.bucket, gran)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Repartição por origem */}
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          <div className="bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-xs font-semibold text-white">
            Onde gastaste mais
          </div>
          <div className="space-y-3 p-4">
            {origens.length === 0 ? (
              <p className="py-6 text-center text-sm text-black/40">Sem dados.</p>
            ) : (
              origens.map(([origem, v]) => {
                const meta = ORIGEM[origem] ?? ORIGEM.outro;
                const pct = Math.round((v / totalOrigem) * 100);
                return (
                  <div key={origem}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.cor }} />
                        {meta.label}
                      </span>
                      <span className="text-black/50">
                        {v} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.cor }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function rotuloBucket(b: string, gran: Gran): string {
  if (gran === "mes") return b.slice(5); // "MM"
  if (gran === "dia") return b.slice(8); // "DD"
  if (gran === "ano") return b; // "YYYY"
  return b.replace(/^\d{4}-/, ""); // semana "Sxx"
}

function CardKpi({ titulo, valor, sub }: { titulo: string; valor: string; sub?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-xs font-semibold text-white">{titulo}</div>
      <div className="p-4 text-2xl font-semibold">
        {valor}
        {sub && <span className="text-base font-normal text-black/40"> {sub}</span>}
      </div>
    </div>
  );
}

function CardKpiBar({ titulo, percent }: { titulo: string; percent: number }) {
  const cor = percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-brand";
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-xs font-semibold text-white">{titulo}</div>
      <div className="p-4">
        <div className="text-2xl font-semibold">{percent}%</div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
          <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
