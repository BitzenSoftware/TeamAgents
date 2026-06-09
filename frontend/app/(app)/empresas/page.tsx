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

type Aba = "cadastro" | "consumo" | "dashboards";
type Gran = "semana" | "mes" | "trimestre" | "ano";

const ABAS: { id: Aba; label: string }[] = [
  { id: "cadastro", label: "Cadastro" },
  { id: "consumo", label: "Consumo" },
  { id: "dashboards", label: "Dashboards" },
];

const GRAN_TABS: { id: Gran; label: string }[] = [
  { id: "semana", label: "Semanal" },
  { id: "mes", label: "Mensal" },
  { id: "trimestre", label: "Trimestral" },
  { id: "ano", label: "Anual" },
];

export default function EmpresasPage() {
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
        <h1 className="text-xl font-semibold">Empresas</h1>
        <p className="mt-1 text-sm text-black/50">Gestão e métricas de todas as empresas da plataforma.</p>
      </header>

      {/* Abas */}
      <div className="mb-5 inline-flex gap-1 rounded-xl border border-black/10 bg-white p-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              aba === a.id ? "bg-brand text-white" : "text-black/55 hover:bg-black/5"
            }`}
          >
            {a.label}
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
  const [linhas, setLinhas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [plano, setPlano] = useState("todos");
  const [status, setStatus] = useState("todos");

  useEffect(() => {
    api.empresas().then(setLinhas).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
          placeholder="Procurar empresa ou email…"
          className="w-64 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select value={plano} onChange={(e) => setPlano(e.target.value)} aria-label="Plano" className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
          <option value="todos">Todos os planos</option>
          {planos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado" className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
          <option value="todos">Todos os estados</option>
          <option value="ativa">Com assinatura</option>
          <option value="sem">Sem assinatura</option>
        </select>
        <span className="ml-auto text-sm text-black/50">{filtradas.length} empresa(s)</span>
      </div>

      <Tabela
        loading={loading}
        vazio="Sem empresas."
        colunas={["Empresa", "Email", "Plano", "Créditos/mês", "Avulsos", "Consumo (mês)", "Assinatura", "Desde"]}
        alinhar={["left", "left", "left", "right", "right", "right", "center", "left"]}
        linhas={filtradas.map((l) => [
          l.nome ?? "—",
          l.email || "—",
          l.plano_nome ?? "—",
          l.creditos_mensais?.toLocaleString("pt-BR") ?? "—",
          l.creditos_avulsos.toLocaleString("pt-BR"),
          l.consumo_mes.toLocaleString("pt-BR"),
          <Badge key="b" ok={l.tem_assinatura} cancela={l.assinatura_cancela_em} />,
          fmtData(l.created_at),
        ])}
      />
    </div>
  );
}

function Badge({ ok, cancela }: { ok: boolean; cancela: string | null }) {
  if (ok && cancela) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Cancela {fmtData(cancela)}</span>;
  }
  return ok ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Ativa</span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Sem assinatura</span>
  );
}

/* =============================== CONSUMO =============================== */
function AbaConsumo() {
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
          placeholder="Procurar empresa…"
          className="w-64 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
        />
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano" className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-black/50">
          Total no ano: <strong className="text-ink">{totalGeral.toLocaleString("pt-BR")}</strong> créditos
        </span>
      </div>

      <Tabela
        loading={loading}
        vazio="Sem consumo no período."
        colunas={["Empresa", "Plano", "Total", "Campanhas", "SDR", "BI", "Executivo", "Outro"]}
        alinhar={["left", "left", "right", "right", "right", "right", "right", "right"]}
        linhas={filtradas.map((l) => [
          l.nome ?? "—",
          l.plano_nome ?? "—",
          <strong key="t">{l.total.toLocaleString("pt-BR")}</strong>,
          l.campanhas.toLocaleString("pt-BR"),
          l.sdr.toLocaleString("pt-BR"),
          l.bi.toLocaleString("pt-BR"),
          l.executivo.toLocaleString("pt-BR"),
          l.outro.toLocaleString("pt-BR"),
        ])}
      />
    </div>
  );
}

/* =============================== DASHBOARDS =============================== */
function AbaDashboards() {
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
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano" className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm">
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi titulo="Empresas" valor={`${dash?.total_empresas ?? 0}`} />
        <Kpi titulo="Com assinatura" valor={`${dash?.empresas_ativas ?? 0}`} />
        <Kpi titulo="MRR" valor={fmtMoeda(dash?.mrr ?? 0)} destaque />
        <Kpi titulo="Faturamento (período)" valor={fmtMoeda(dash?.faturamento_total ?? 0)} />
        <Kpi titulo="Consumo (período)" valor={`${(dash?.consumo_total ?? 0).toLocaleString("pt-BR")}`} sub="créditos" />
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-black/40">A carregar…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Grafico titulo="Consumo de tokens" subtitulo="créditos por período" series={dash?.consumo_series ?? []} cor="#4f46e5" gran={gran} formato={(v) => v.toLocaleString("pt-BR")} />
          <Grafico
            titulo="Faturamento"
            subtitulo={`assinaturas ${fmtMoeda(dash?.faturamento_por_tipo?.assinatura ?? 0)} · pacotes ${fmtMoeda(dash?.faturamento_por_tipo?.pacote ?? 0)}`}
            series={dash?.faturamento_series ?? []}
            cor="#16a34a"
            gran={gran}
            formato={(v) => fmtMoeda(v)}
          />
          <Grafico titulo="Crescimento" subtitulo="novas empresas por período" series={dash?.crescimento_series ?? []} cor="#db2777" gran={gran} formato={(v) => `${v}`} />
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
  const maxV = Math.max(1, ...series.map((s) => s.total));
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-baseline justify-between gap-2 border-b border-black/5 px-4 py-3">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-[11px] text-black/40">{subtitulo}</span>
      </div>
      <div className="p-4">
        {series.length === 0 ? (
          <p className="py-10 text-center text-sm text-black/40">Sem dados no período.</p>
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
            <tr><td colSpan={colunas.length} className="px-3 py-8 text-center text-black/40">A carregar…</td></tr>
          ) : linhas.length === 0 ? (
            <tr><td colSpan={colunas.length} className="px-3 py-8 text-center text-black/40">{vazio ?? "Sem dados."}</td></tr>
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
function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtMoeda(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function rotulo(b: string, gran: Gran): string {
  if (gran === "mes") return b.slice(5); // MM
  if (gran === "ano") return b; // YYYY
  return b.replace(/^\d{4}-/, ""); // semana Sxx / trimestre Tx
}
