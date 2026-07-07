"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/components/i18n-context";
import { api, type Consumo, type ConsumoDashboard } from "@/lib/api";

type Gran = "dia" | "semana" | "mes" | "ano";

const GRAN_IDS: Gran[] = ["dia", "semana", "mes", "ano"];

// Origem → cor (o rótulo vem do dicionário)
const ORIGEM_COR: Record<string, string> = {
  campanhas: "#4f46e5", sdr: "#16a34a", bi: "#d97706", executivo: "#db2777", outro: "#64748b",
};

export default function ConsumoPage() {
  const tr = useT().consumo;
  const anoAtual = new Date().getFullYear();
  const [consumo, setConsumo] = useState<Consumo | null>(null);
  const [dash, setDash] = useState<ConsumoDashboard | null>(null);
  const [gran, setGran] = useState<Gran>("mes");
  const [ano, setAno] = useState(anoAtual);
  const [loading, setLoading] = useState(false);

  const anos = useMemo(() => Array.from({ length: 4 }, (_, i) => anoAtual - i), [anoAtual]);

  useEffect(() => {
    api.consumo().then(setConsumo).catch(() => {});
  }, []);

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
        <h1 className="text-xl font-semibold">{tr.titulo}</h1>
        <p className="mt-1 text-sm text-black/50">
          {tr.subtitulo}
        </p>
      </header>

      {/* KPIs do plano (mês atual) */}
      {consumo && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {consumo.ilimitado ? (
            <>
              <CardKpi titulo={tr.kpiUsados} valor={`${consumo.usados}`} sub={tr.ilimitado} />
              <CardKpi titulo={tr.disponiveis} valor="∞" />
              <CardKpi titulo={tr.plano} valor={tr.superadmin} sub={tr.creditosIlimitados} />
            </>
          ) : (
            <>
              <CardKpi titulo={tr.kpiUsados} valor={`${consumo.usados}`} sub={`/ ${consumo.total}`} />
              <CardKpi
                titulo={tr.disponiveis}
                valor={`${consumo.disponivel_total ?? consumo.restantes}`}
                sub={
                  consumo.creditos_avulsos
                    ? `(${consumo.restantes} ${tr.doPlano} + ${consumo.creditos_avulsos} ${tr.avulsos})`
                    : undefined
                }
              />
              <CardKpiBar titulo={tr.usoPlano} percent={consumo.percent} />
            </>
          )}
        </div>
      )}

      {/* Controlos */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-black/10 bg-white p-1">
          {GRAN_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setGran(id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                gran === id ? "bg-brand text-white" : "text-black/55 hover:bg-black/5"
              }`}
            >
              {tr.gran[id]}
            </button>
          ))}
        </div>
        {gran !== "ano" && (
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            aria-label={tr.anoAria}
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
          {tr.totalPeriodo} <strong className="text-ink">{dash?.total ?? 0}</strong> {tr.creditos}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Gráfico de barras (série temporal) */}
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white lg:col-span-2">
          <div className="bg-gradient-to-r from-brand to-brand-dark px-4 py-2.5 text-xs font-semibold text-white">
            {tr.consumoPor} {tr.gran[gran].toLowerCase()}
          </div>
          <div className="p-4">
            {loading ? (
              <p className="py-10 text-center text-sm text-black/40">{tr.carregando}</p>
            ) : series.length === 0 ? (
              <p className="py-10 text-center text-sm text-black/40">
                {tr.semConsumo}
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
            {tr.ondeGastou}
          </div>
          <div className="space-y-3 p-4">
            {origens.length === 0 ? (
              <p className="py-6 text-center text-sm text-black/40">{tr.semDados}</p>
            ) : (
              origens.map(([origem, v]) => {
                const cor = ORIGEM_COR[origem] ?? ORIGEM_COR.outro;
                const pct = Math.round((v / totalOrigem) * 100);
                return (
                  <div key={origem}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
                        {tr.origem[origem] ?? tr.origem.outro}
                      </span>
                      <span className="text-black/50">
                        {v} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
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
