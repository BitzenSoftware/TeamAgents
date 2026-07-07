"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, UserRound, CalendarDays } from "lucide-react";
import { useT } from "@/components/i18n-context";
import { api, type Ausencia, type Escala, type Profissional, type Servico } from "@/lib/api";

// dia_semana: 0=domingo .. 6=sábado. Exibição começa na segunda. Labels vêm do dicionário.
const DIAS = [1, 2, 3, 4, 5, 6, 0];

type DiaEscala = {
  ativo: boolean; hora_inicio: string; hora_fim: string; intervalo_min: number;
  almoco: boolean; almoco_inicio: string; almoco_fim: string;
};
const DIA_PADRAO: DiaEscala = {
  ativo: false, hora_inicio: "09:00", hora_fim: "18:00", intervalo_min: 30,
  almoco: true, almoco_inicio: "12:00", almoco_fim: "13:00",
};

export default function ProfissionaisPage() {
  const t = useT().profissionais;
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [editar, setEditar] = useState<Profissional | "novo" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api.profissionais().then(setProfs).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
    api.servicos().then(setServicos).catch(() => {});
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeServico = (id: string) => servicos.find((s) => s.id === id)?.nome ?? "—";

  return (
    <div className="p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="text-sm text-black/50">{t.subtitulo}</p>
        </div>
        <button onClick={() => setEditar("novo")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> {t.adicionar}
        </button>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {profs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          {t.vazio}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profs.map((p) => (
            <button key={p.id} onClick={() => setEditar(p)}
              className="rounded-xl border border-black/10 bg-white p-4 text-left transition hover:border-brand/30 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                  <UserRound size={18} />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.nome}</div>
                  <div className="text-xs text-black/45">
                    {p.escalas.length} {t.diasDeEscala}{!p.ativo && t.inativoSuffix}
                  </div>
                </div>
              </div>
              {p.servico_ids.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {p.servico_ids.slice(0, 4).map((id) => (
                    <span key={id} className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-black/55">{nomeServico(id)}</span>
                  ))}
                  {p.servico_ids.length > 4 && <span className="text-[10px] text-black/40">+{p.servico_ids.length - 4}</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {editar && (
        <ModalProfissional
          prof={editar === "novo" ? null : editar}
          servicos={servicos}
          onClose={() => setEditar(null)}
          onSaved={() => { setEditar(null); carregar(); }}
        />
      )}
    </div>
  );
}

function ModalProfissional({ prof, servicos, onClose, onSaved }: {
  prof: Profissional | null; servicos: Servico[]; onClose: () => void; onSaved: () => void;
}) {
  const t = useT().profissionais;
  const c = useT().common;
  const [aba, setAba] = useState<"dados" | "escala" | "ausencia">("dados");
  const [nome, setNome] = useState(prof?.nome ?? "");
  const [ativo, setAtivo] = useState(prof?.ativo ?? true);
  const [servIds, setServIds] = useState<string[]>(prof?.servico_ids ?? []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Escala por dia (mapa n->DiaEscala) inicializada a partir do profissional.
  const [dias, setDias] = useState<Record<number, DiaEscala>>(() => {
    const m: Record<number, DiaEscala> = {};
    for (const n of DIAS) m[n] = { ...DIA_PADRAO };
    for (const e of prof?.escalas ?? []) {
      m[e.dia_semana] = {
        ativo: true,
        hora_inicio: (e.hora_inicio || "09:00").slice(0, 5),
        hora_fim: (e.hora_fim || "18:00").slice(0, 5),
        intervalo_min: e.intervalo_min || 30,
        almoco: !!(e.almoco_inicio && e.almoco_fim),
        almoco_inicio: (e.almoco_inicio || "12:00").slice(0, 5),
        almoco_fim: (e.almoco_fim || "13:00").slice(0, 5),
      };
    }
    return m;
  });

  function setDia(n: number, patch: Partial<DiaEscala>) {
    setDias((m) => ({ ...m, [n]: { ...m[n], ...patch } }));
  }

  function escalasPayload(): Escala[] {
    return DIAS.filter((n) => dias[n].ativo).map((n) => {
      const e = dias[n];
      return {
        dia_semana: n, hora_inicio: e.hora_inicio, hora_fim: e.hora_fim, intervalo_min: e.intervalo_min,
        almoco_inicio: e.almoco ? e.almoco_inicio : null, almoco_fim: e.almoco ? e.almoco_fim : null,
      };
    });
  }

  async function salvar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    setErro(null);
    const body = { nome: nome.trim(), ativo, servico_ids: servIds, escalas: escalasPayload() };
    try {
      if (prof) await api.atualizarProfissional(prof.id, body);
      else await api.criarProfissional(body);
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold">{prof ? `${t.editarPrefix}${prof.nome}` : t.novoTitulo}</h2>
        </div>
        <div className="flex gap-1 border-b border-black/10 px-3">
          {(["dados", "escala", "ausencia"] as const).map((a) => (
            <button key={a} onClick={() => setAba(a)}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition ${
                aba === a ? "border-brand text-brand" : "border-transparent text-black/50 hover:text-ink"
              }`}>
              {a === "dados" ? t.abaDados : a === "escala" ? t.abaEscala : t.abaAusencia}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {aba === "dados" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-black/55">{t.nome}</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t.nomePh}
                className="mb-4 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
              <label className="mb-2 block text-xs font-medium text-black/55">{t.servicosHabilitados}</label>
              {servicos.length === 0 ? (
                <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">{t.semServicos}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {servicos.map((s) => {
                    const on = servIds.includes(s.id);
                    return (
                      <button key={s.id} type="button"
                        onClick={() => setServIds((l) => on ? l.filter((x) => x !== s.id) : [...l, s.id])}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          on ? "border-brand bg-brand/10 text-brand" : "border-black/15 text-black/60 hover:bg-black/[0.03]"
                        }`}>
                        {s.nome}
                      </button>
                    );
                  })}
                </div>
              )}
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> {t.profAtivo}
              </label>
            </div>
          )}

          {aba === "escala" && (
            <div className="space-y-2">
              {DIAS.map((n) => {
                const e = dias[n];
                return (
                  <div key={n} className={`rounded-xl border p-3 ${e.ativo ? "border-black/15 bg-white" : "border-black/10 bg-black/[0.02]"}`}>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={e.ativo} onChange={(ev) => setDia(n, { ativo: ev.target.checked })} />
                      {t.dias[n]}
                    </label>
                    {e.ativo && (
                      <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        <Campo label={t.inicio}><input type="time" value={e.hora_inicio} onChange={(ev) => setDia(n, { hora_inicio: ev.target.value })} className={inputCls} /></Campo>
                        <Campo label={t.fim}><input type="time" value={e.hora_fim} onChange={(ev) => setDia(n, { hora_fim: ev.target.value })} className={inputCls} /></Campo>
                        <Campo label={t.intervalo}>
                          <select value={e.intervalo_min} onChange={(ev) => setDia(n, { intervalo_min: Number(ev.target.value) })} className={inputCls}>
                            {[15, 20, 30, 40, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                          </select>
                        </Campo>
                        <Campo label={t.almoco}>
                          <label className="flex h-[34px] items-center gap-1.5 text-xs text-black/60">
                            <input type="checkbox" checked={e.almoco} onChange={(ev) => setDia(n, { almoco: ev.target.checked })} /> {t.almocoTem}
                          </label>
                        </Campo>
                        {e.almoco && (
                          <>
                            <Campo label={t.almocoInicio}><input type="time" value={e.almoco_inicio} onChange={(ev) => setDia(n, { almoco_inicio: ev.target.value })} className={inputCls} /></Campo>
                            <Campo label={t.almocoFim}><input type="time" value={e.almoco_fim} onChange={(ev) => setDia(n, { almoco_fim: ev.target.value })} className={inputCls} /></Campo>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {aba === "ausencia" && (
            prof ? <AbaAusencia profId={prof.id} />
              : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t.salvarPrimeiro}</p>
          )}
        </div>

        {erro && <p className="mx-5 mb-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
        <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">{c.cancelar}</button>
          <button onClick={salvar} disabled={salvando || !nome.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {salvando ? c.salvando : prof ? t.atualizar : t.criar}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-black/15 px-2.5 py-1.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-black/40">{label}</div>{children}</div>;
}

function AbaAusencia({ profId }: { profId: string }) {
  const tr = useT().profissionais;
  const [lista, setLista] = useState<Ausencia[]>([]);
  const [tipo, setTipo] = useState<"dia_todo" | "horas">("dia_todo");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaInicio, setHoraInicio] = useState("12:00");
  const [horaFim, setHoraFim] = useState("14:00");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => { api.ausencias(profId).then(setLista).catch(() => {}); }, [profId]);
  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!dataInicio) { setErro(tr.informeData); return; }
    setErro(null);
    const body: Partial<Ausencia> = {
      tipo, data_inicio: dataInicio, data_fim: dataFim || dataInicio, motivo: motivo || null,
      ...(tipo === "horas" ? { hora_inicio: horaInicio, hora_fim: horaFim } : {}),
    };
    try {
      await api.criarAusencia(profId, body);
      setDataInicio(""); setDataFim(""); setMotivo("");
      carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }

  return (
    <div>
      <div className="rounded-xl border border-black/10 bg-paper p-3.5">
        <div className="mb-2 flex gap-2">
          {(["dia_todo", "horas"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setTipo(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${tipo === k ? "bg-brand text-white" : "border border-black/15 text-black/60"}`}>
              {k === "dia_todo" ? tr.diaInteiro : tr.porHoras}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Campo label={tr.de}><input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={inputCls} /></Campo>
          <Campo label={tr.ate}><input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={inputCls} /></Campo>
          {tipo === "horas" && (
            <>
              <Campo label={tr.horaInicio}><input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={inputCls} /></Campo>
              <Campo label={tr.horaFim}><input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className={inputCls} /></Campo>
            </>
          )}
        </div>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tr.motivoPh}
          className={`mt-2.5 ${inputCls}`} />
        {erro && <p className="mt-2 text-xs text-rose-700">{erro}</p>}
        <button onClick={adicionar} className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-1.5 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={14} /> {tr.adicionarAusencia}
        </button>
      </div>

      <div className="mt-3 space-y-1.5">
        {lista.length === 0 && <p className="py-3 text-center text-xs text-black/35">{tr.nenhumaAusencia}</p>}
        {lista.map((a) => (
          <div key={a.id} className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm">
            <CalendarDays size={14} className="shrink-0 text-black/30" />
            <span className="min-w-0 flex-1 truncate">
              {a.data_inicio === a.data_fim ? a.data_inicio : `${a.data_inicio} → ${a.data_fim}`}
              {a.tipo === "horas" && a.hora_inicio && ` · ${a.hora_inicio.slice(0, 5)}–${(a.hora_fim || "").slice(0, 5)}`}
              {a.motivo && <span className="text-black/45"> · {a.motivo}</span>}
            </span>
            <button onClick={() => api.apagarAusencia(profId, a.id).then(carregar)} aria-label={tr.apagarAria}
              className="grid h-7 w-7 shrink-0 place-items-center rounded text-black/35 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
