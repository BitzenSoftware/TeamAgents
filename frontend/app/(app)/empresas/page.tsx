"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  SUPERADMIN_EMAIL,
  type AdminDashboard,
  type Empresa,
  type EmpresaConsumo,
} from "@/lib/api";
import { useAuth } from "@/components/auth-context";
import { useLocale, useT } from "@/components/i18n-context";
import type { Locale } from "@/lib/i18n/locale";

type Aba = "cadastro" | "consumo" | "dashboards";
type Gran = "semana" | "mes" | "trimestre" | "ano";

const ABA_IDS: Aba[] = ["cadastro", "consumo", "dashboards"];
const GRAN_IDS: Gran[] = ["semana", "mes", "trimestre", "ano"];

export default function EmpresasPage() {
  const t = useT().empresas;
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  const [aba, setAba] = useState<Aba>("cadastro");

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/pipeline");
  }, [authLoading, isAdmin, router]);

  if (!authLoading && !isAdmin) return null;

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="mt-1 text-sm text-black/50">{t.subtitulo}</p>
      </header>

      {/* Abas */}
      <div className="mb-5 inline-flex gap-1 rounded-xl border border-black/10 bg-white p-1">
        {ABA_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              aba === id ? "bg-brand text-white" : "text-black/55 hover:bg-black/5"
            }`}
          >
            {t.abas[id]}
          </button>
        ))}
      </div>

      {aba === "cadastro" && <AbaCadastro />}
      {aba === "consumo" && <AbaConsumo />}
      {aba === "dashboards" && <AbaDashboards />}
    </div>
  );
}

/* =============================== CADASTRO =============================== */
function AbaCadastro() {
  const t = useT().empresas;
  const { locale } = useLocale();
  const [linhas, setLinhas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [plano, setPlano] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [sel, setSel] = useState<Empresa | null>(null);

  const carregar = useCallback(() => {
    api.empresas().then(setLinhas).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const planos = useMemo(
    () => Array.from(new Set(linhas.map((l) => l.plano_nome).filter(Boolean))) as string[],
    [linhas],
  );

  const filtradas = linhas.filter((l) => {
    const q = busca.trim().toLowerCase();
    if (q && !(`${l.nome ?? ""} ${l.email}`.toLowerCase().includes(q))) return false;
    if (plano !== "todos" && l.plano_nome !== plano) return false;
    if (status === "ativa" && !l.tem_assinatura) return false;
    if (status === "sem" && l.tem_assinatura) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t.procurarPh}
          className="w-64 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select value={plano} onChange={(e) => setPlano(e.target.value)} aria-label={t.planoAria} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
          <option value="todos">{t.todosPlanos}</option>
          {planos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t.estadoAria} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
          <option value="todos">{t.todosEstados}</option>
          <option value="ativa">{t.comAssinatura}</option>
          <option value="sem">{t.semAssinatura}</option>
        </select>
        <span className="ml-auto text-sm text-black/50">{filtradas.length} {t.empresasSuf}</span>
      </div>

      <Tabela
        loading={loading}
        vazio={t.semEmpresas}
        colunas={[t.colEmpresa, t.colEmail, t.colPlano, t.colCreditosMes, t.colAvulsos, t.colConsumoMes, t.colAssinatura, t.colDesde]}
        alinhar={["left", "left", "left", "right", "right", "right", "center", "left"]}
        linhas={filtradas.map((l) => [
          <button key="n" type="button" onClick={() => setSel(l)} className="font-medium text-brand hover:underline">
            {l.nome ?? "—"}
          </button>,
          l.email || "—",
          l.ilimitado ? t.ilimitado : (l.plano_nome ?? "—"),
          l.ilimitado ? "∞" : (l.creditos_mensais != null ? nf(l.creditos_mensais, locale) : "—"),
          nf(l.creditos_avulsos, locale),
          nf(l.consumo_mes, locale),
          l.ilimitado ? (
            <span key="b" className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">{t.superadmin}</span>
          ) : (
            <Badge key="b" ok={l.tem_assinatura} cancela={l.assinatura_cancela_em} />
          ),
          fmtData(l.created_at, locale),
        ])}
      />

      {sel && <ModalEmpresa empresa={sel} onClose={() => setSel(null)} onChanged={carregar} />}
    </div>
  );
}

/* =============================== Modal da empresa (Dados / Créditos) =============================== */
function ModalEmpresa({ empresa, onClose, onChanged }: { empresa: Empresa; onClose: () => void; onChanged: () => void }) {
  const t = useT().empresas;
  const { locale } = useLocale();
  const [aba, setAba] = useState<"dados" | "creditos">("dados");
  const [avulsos, setAvulsos] = useState(empresa.creditos_avulsos);
  const [qtd, setQtd] = useState(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function conceder() {
    if (!qtd || qtd <= 0) return;
    setBusy(true); setMsg(null); setErro(null);
    try {
      const r = await api.adminConcederCreditos(empresa.id, qtd);
      setAvulsos(r.creditos_avulsos);
      setMsg(`+${nf(qtd, locale)}${t.concedidosMeio}${nf(r.creditos_avulsos, locale)}.`);
      onChanged();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t.erroConceder);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="min-w-0 truncate text-sm font-semibold text-white">{empresa.nome ?? t.empresaDefault}</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>

        <div className="flex gap-1 border-b border-black/10 px-3 pt-3">
          {([["dados", t.abaDados], ["creditos", t.abaCreditos]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setAba(id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${aba === id ? "bg-brand/10 text-brand" : "text-black/50 hover:bg-black/5"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {aba === "dados" ? (
            <div className="space-y-2 text-sm">
              <Linha k={t.colEmpresa} v={empresa.nome ?? "—"} />
              <Linha k={t.colEmail} v={empresa.email || "—"} />
              <Linha k={t.colPlano} v={empresa.ilimitado ? t.ilimitado : (empresa.plano_nome ?? "—")} />
              <Linha k={t.colCreditosMes} v={empresa.ilimitado ? "∞" : (empresa.creditos_mensais != null ? nf(empresa.creditos_mensais, locale) : "—")} />
              <Linha k={t.creditosAvulsos} v={nf(avulsos, locale)} />
              <Linha k={t.colConsumoMes} v={nf(empresa.consumo_mes, locale)} />
              <Linha k={t.colAssinatura} v={empresa.ilimitado ? t.superadmin : empresa.tem_assinatura ? t.ativa : t.semAssinatura} />
              <Linha k={t.clienteDesde} v={fmtData(empresa.created_at, locale)} />
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-black/60">
                {t.concederIntroA}<strong>{t.concederCortesia}</strong>{t.concederIntroB}<strong>{t.concederAvulsos}</strong>{t.concederIntroC}
              </p>
              <div className="mb-3 rounded-lg bg-paper p-3 text-sm">
                {t.saldoAtual} <strong>{nf(avulsos, locale)}</strong> {t.creditos}
              </div>
              <label className="mb-1 block text-xs font-medium text-black/55">{t.qtdConceder}</label>
              <div className="flex gap-2">
                <input type="number" min={1} value={qtd}
                  onChange={(e) => setQtd(Number(e.target.value))}
                  className="w-40 rounded-lg border border-black/15 px-3 py-2 text-sm" />
                <button type="button" onClick={conceder} disabled={busy || qtd <= 0}
                  className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                  {busy ? t.concedendo : t.concederBtn}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[100, 200, 500].map((n) => (
                  <button key={n} type="button" onClick={() => setQtd(n)}
                    className="rounded-full border border-black/15 px-2.5 py-1 text-xs text-black/60 hover:bg-black/5">
                    +{n}
                  </button>
                ))}
              </div>
              {msg && <p className="mt-3 text-sm text-emerald-700">✓ {msg}</p>}
              {erro && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/5 py-1.5">
      <span className="text-black/45">{k}</span>
      <span className="min-w-0 truncate font-medium">{v}</span>
    </div>
  );
}

function Badge({ ok, cancela }: { ok: boolean; cancela: string | null }) {
  const t = useT().empresas;
  const { locale } = useLocale();
  if (ok && cancela) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t.cancela} {fmtData(cancela, locale)}</span>;
  }
  return ok ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t.ativa}</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{t.semAssinatura}</span>
  );
}

/* =============================== CONSUMO =============================== */
function AbaConsumo() {
  const t = useT().empresas;
  const { locale } = useLocale();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [busca, setBusca] = useState("");
  const [linhas, setLinhas] = useState<EmpresaConsumo[]>([]);
  const [loading, setLoading] = useState(true);
  const anos = useMemo(() => Array.from({ length: 4 }, (_, i) => anoAtual - i), [anoAtual]);

  useEffect(() => {
    setLoading(true);
    api.empresasConsumo(`${ano}-01-01`, `${ano}-12-31`).then(setLinhas).catch(() => setLinhas([])).finally(() => setLoading(false));
  }, [ano]);

  const filtradas = linhas.filter((l) => {
    const q = busca.trim().toLowerCase();
    return !q || (l.nome ?? "").toLowerCase().includes(q);
  });
  const totalGeral = filtradas.reduce((a, l) => a + l.total, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t.procurarEmpresaPh}
          className="w-64 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label={t.anoAria} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-black/50">
          {t.totalAno} <strong className="text-ink">{nf(totalGeral, locale)}</strong> {t.creditos}
        </span>
      </div>

      <Tabela
        loading={loading}
        vazio={t.semConsumo}
        colunas={[t.colEmpresa, t.colPlano, t.colTotal, t.colCampanhas, t.colSdr, t.colBi, t.colExecutivo, t.colOutro]}
        alinhar={["left", "left", "right", "right", "right", "right", "right", "right"]}
        linhas={filtradas.map((l) => [
          l.nome ?? "—",
          l.plano_nome ?? "—",
          <strong key="t">{nf(l.total, locale)}</strong>,
          nf(l.campanhas, locale),
          nf(l.sdr, locale),
          nf(l.bi, locale),
          nf(l.executivo, locale),
          nf(l.outro, locale),
        ])}
      />
    </div>
  );
}

/* =============================== DASHBOARDS =============================== */
function AbaDashboards() {
  const tr = useT().empresas;
  const { locale } = useLocale();
  const anoAtual = new Date().getFullYear();
  const [gran, setGran] = useState<Gran>("mes");
  const [ano, setAno] = useState(anoAtual);
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const anos = useMemo(() => Array.from({ length: 4 }, (_, i) => anoAtual - i), [anoAtual]);

  const carregar = useCallback(() => {
    setLoading(true);
    const de = gran === "ano" ? "2000-01-01" : `${ano}-01-01`;
    const ate = gran === "ano" ? `${anoAtual}-12-31` : `${ano}-12-31`;
    api.adminDashboards(de, ate, gran).then(setDash).catch(() => setDash(null)).finally(() => setLoading(false));
  }, [gran, ano, anoAtual]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div>
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
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label={tr.anoAria} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPIs */}
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo={tr.kpiEmpresas} valor={`${dash?.total_empresas ?? 0}`} sub={`${dash?.empresas_ativas ?? 0} ${tr.comAssinaturaSuf}`} />
        <Kpi titulo={tr.kpiMrr} valor={fmtMoeda(dash?.mrr ?? 0, locale)} destaque />
        <Kpi titulo={tr.kpiFaturamento} valor={fmtMoeda(dash?.faturamento_total ?? 0, locale)} />
        <Kpi titulo={tr.kpiConsumo} valor={nf(dash?.consumo_total ?? 0, locale)} sub={tr.creditos} />
      </div>
      {/* Custo real & margem (no-prejuízo) */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi titulo={tr.kpiCustoIa} valor={fmtMoeda(dash?.custo_brl_total ?? 0, locale)} sub={`$ ${(dash?.custo_usd_total ?? 0).toFixed(2)} ${tr.emTokens}`} />
        <Kpi titulo={tr.kpiMargem} valor={fmtMoeda(dash?.margem_brl ?? 0, locale)} destaque />
        <Kpi titulo={tr.kpiMargemPct} valor={`${dash?.margem_pct ?? 0}%`} sub={tr.receitaCusto} />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-black/40">{tr.carregando}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Grafico titulo={tr.gConsumoTokens} subtitulo={tr.gCreditosPeriodo} series={dash?.consumo_series ?? []} cor="#4f46e5" gran={gran} formato={(v) => nf(v, locale)} />
          <Grafico
            titulo={tr.gFaturamento}
            subtitulo={`${tr.gAssinaturas} ${fmtMoeda(dash?.faturamento_por_tipo?.assinatura ?? 0, locale)} · ${tr.gPacotes} ${fmtMoeda(dash?.faturamento_por_tipo?.pacote ?? 0, locale)}`}
            series={dash?.faturamento_series ?? []}
            cor="#16a34a"
            gran={gran}
            formato={(v) => fmtMoeda(v, locale)}
          />
          <Grafico titulo={tr.gCrescimento} subtitulo={tr.gNovasEmpresas} series={dash?.crescimento_series ?? []} cor="#db2777" gran={gran} formato={(v) => `${v}`} />
          <Grafico titulo={tr.gCustoIa} subtitulo={`${tr.gCustoRealTokens} (${locale === "en" ? "$" : "R$"})`} series={dash?.custo_series ?? []} cor="#dc2626" gran={gran} formato={(v) => fmtMoeda(v, locale)} />
        </div>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, sub, destaque }: { titulo: string; valor: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-xl border bg-white ${destaque ? "border-brand/40 ring-1 ring-brand/20" : "border-black/10"}`}>
      <div className="bg-gradient-to-r from-brand to-brand-dark px-3 py-1.5 text-[11px] font-semibold text-white">{titulo}</div>
      <div className="p-3">
        <div className="text-xl font-semibold">{valor}</div>
        {sub && <div className="text-xs text-black/40">{sub}</div>}
      </div>
    </div>
  );
}

function Grafico({
  titulo,
  subtitulo,
  series,
  cor,
  gran,
  formato,
}: {
  titulo: string;
  subtitulo: string;
  series: { bucket: string; total: number }[];
  cor: string;
  gran: Gran;
  formato: (v: number) => string;
}) {
  const tr = useT().empresas;
  const maxV = Math.max(1, ...series.map((s) => s.total));
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-baseline justify-between gap-2 border-b border-black/5 px-4 py-3">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-[11px] text-black/40">{subtitulo}</span>
      </div>
      <div className="p-4">
        {series.length === 0 ? (
          <p className="py-10 text-center text-sm text-black/40">{tr.semDados}</p>
        ) : (
          <div className="flex h-56 items-end gap-1.5 overflow-x-auto">
            {series.map((s) => (
              <div key={s.bucket} className="flex min-w-[34px] flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] font-medium text-black/60">{formato(s.total)}</span>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{ height: `${(s.total / maxV) * 100}%`, minHeight: s.total > 0 ? "4px" : "0", background: `linear-gradient(180deg, ${cor}, ${cor}aa)` }}
                  title={`${s.bucket}: ${formato(s.total)}`}
                />
                <span className="w-full truncate text-center text-[9px] text-black/40" title={s.bucket}>
                  {rotulo(s.bucket, gran)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================== Tabela estilo Excel =============================== */
function Tabela({
  colunas,
  linhas,
  alinhar,
  loading,
  vazio,
}: {
  colunas: string[];
  linhas: React.ReactNode[][];
  alinhar?: ("left" | "right" | "center")[];
  loading?: boolean;
  vazio?: string;
}) {
  const tr = useT().empresas;
  const AL: Record<string, string> = { left: "text-left", right: "text-right", center: "text-center" };
  const al = (i: number) => AL[alinhar?.[i] ?? "left"];
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-brand to-brand-dark text-white">
            {colunas.map((c, i) => (
              <th key={c} className={`whitespace-nowrap px-3 py-2.5 font-semibold ${al(i)}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={colunas.length} className="px-3 py-8 text-center text-black/40">{tr.carregando}</td></tr>
          ) : linhas.length === 0 ? (
            <tr><td colSpan={colunas.length} className="px-3 py-8 text-center text-black/40">{vazio ?? tr.semDados}</td></tr>
          ) : (
            linhas.map((linha, r) => (
              <tr key={r} className={`${r % 2 === 1 ? "bg-black/[0.035]" : "bg-white"} hover:bg-brand/5`}>
                {linha.map((cel, i) => (
                  <td key={i} className={`whitespace-nowrap border-t border-black/5 px-3 py-2 ${al(i)}`}>{cel}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =============================== helpers =============================== */
const bcp = (locale: Locale) => (locale === "en" ? "en-US" : "pt-BR");
const nf = (v: number, locale: Locale) => v.toLocaleString(bcp(locale));

function fmtData(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(bcp(locale), { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtMoeda(v: number, locale: Locale): string {
  const sym = locale === "en" ? "$" : "R$";
  return `${sym} ${v.toLocaleString(bcp(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function rotulo(b: string, gran: Gran): string {
  if (gran === "mes") return b.slice(5); // MM
  if (gran === "ano") return b; // YYYY
  return b.replace(/^\d{4}-/, ""); // semana Sxx / trimestre Tx
}
