"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2 } from "lucide-react";
import { api, type Agendamento, type Profissional, type Servico, type Slot } from "@/lib/api";

const HORA_INI = 7;
const HORA_FIM = 21;
const PX_HORA = 52;
const DIAS_LABEL = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// As escalas são no fuso da clínica (Brasil). Exibimos/posicionamos sempre nesse
// fuso, independentemente do fuso do navegador de quem está olhando.
const CLINIC_TZ = "America/Sao_Paulo";
const _fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: CLINIC_TZ, hour: "2-digit", minute: "2-digit" });
const _fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: CLINIC_TZ, weekday: "short", day: "2-digit", month: "2-digit" });
const _fmtParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLINIC_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
});

/** Parte de data/hora de um ISO no fuso da clínica. */
function partes(iso: string): { ymd: string; hh: number; mm: number } {
  const o: Record<string, string> = {};
  for (const p of _fmtParts.formatToParts(new Date(iso))) o[p.type] = p.value;
  return { ymd: `${o.year}-${o.month}-${o.day}`, hh: Number(o.hour), mm: Number(o.minute) };
}
const horaClinic = (iso: string) => _fmtHora.format(new Date(iso));

function inicioSemana(base: Date): Date {
  const d = new Date(base);
  const diff = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - diff);
  d.setHours(12, 0, 0, 0); // meio-dia evita troca de data por fuso
  return d;
}

export default function AgendaPage() {
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profId, setProfId] = useState<string>("");
  const [semana, setSemana] = useState<Date>(() => inicioSemana(new Date()));
  const [ags, setAgs] = useState<Agendamento[]>([]);
  const [novo, setNovo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.profissionais().then((p) => { setProfs(p); if (p[0] && !profId) setProfId(p[0].id); }).catch(() => {});
    api.servicos().then(setServicos).catch(() => {});
  }, [profId]);

  // Dias da semana exibida (Date ao meio-dia) + a sua data no fuso da clínica.
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana); d.setDate(d.getDate() + i);
    return { date: d, ymd: partes(d.toISOString()).ymd, num: d.getDate() };
  }), [semana]);
  const hojeYmd = partes(new Date().toISOString()).ymd;

  const carregar = useCallback(() => {
    if (!profId) return;
    // janela folgada (±1 dia) p/ não perder agendamentos perto da borda por fuso.
    const de = new Date(semana); de.setDate(de.getDate() - 1);
    const ate = new Date(semana); ate.setDate(ate.getDate() + 8);
    api.agendamentos(de.toISOString(), ate.toISOString(), profId)
      .then((a) => { setAgs(a.filter((x) => x.status !== "cancelado")); setErro(null); })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [profId, semana]);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeServico = (id: string | null) => servicos.find((s) => s.id === id)?.nome ?? "";

  return (
    <div className="p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Agenda</h1>
          <p className="text-sm text-black/50">Horários no fuso da clínica (Brasil). Marcações manuais bloqueiam a disponibilidade.</p>
        </div>
        <button onClick={() => setNovo(true)} disabled={!profId}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
          <Plus size={16} /> Novo agendamento
        </button>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select value={profId} onChange={(e) => setProfId(e.target.value)} aria-label="Profissional"
          className="rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand">
          {profs.length === 0 && <option value="">Nenhum profissional</option>}
          {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <button onClick={() => setSemana((s) => { const d = new Date(s); d.setDate(d.getDate() - 7); return d; })} aria-label="Semana anterior"
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/15 hover:bg-black/5"><ChevronLeft size={16} /></button>
          <button onClick={() => setSemana(inicioSemana(new Date()))} className="rounded-lg border border-black/15 px-3 py-2 text-xs font-medium hover:bg-black/5">Hoje</button>
          <button onClick={() => setSemana((s) => { const d = new Date(s); d.setDate(d.getDate() + 7); return d; })} aria-label="Próxima semana"
            className="grid h-9 w-9 place-items-center rounded-lg border border-black/15 hover:bg-black/5"><ChevronRight size={16} /></button>
        </div>
        <span className="text-sm text-black/50">
          {dias[0].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – {dias[6].date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </span>
      </div>

      {erro && <p className="mb-3 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{erro}</p>}

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <div className="min-w-[720px]">
          <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div className="border-b border-black/10" />
            {dias.map((d, i) => (
              <div key={i} className={`border-b border-l border-black/10 py-2 text-center ${d.ymd === hojeYmd ? "bg-brand/5" : ""}`}>
                <div className="text-[11px] font-medium text-black/45">{DIAS_LABEL[i]}</div>
                <div className={`text-sm font-semibold ${d.ymd === hojeYmd ? "text-brand" : ""}`}>{d.num}</div>
              </div>
            ))}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
            <div>
              {Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => (
                <div key={i} className="relative border-b border-black/5 text-right" style={{ height: PX_HORA }}>
                  <span className="absolute -top-2 right-1 text-[10px] text-black/35">{HORA_INI + i}h</span>
                </div>
              ))}
            </div>
            {dias.map((d, i) => (
              <DiaColuna key={i} ymd={d.ymd} ags={ags} nomeServico={nomeServico} onChange={carregar} />
            ))}
          </div>
        </div>
      </div>

      {novo && (
        <ModalNovo
          profs={profs} servicos={servicos} profIdInicial={profId}
          onClose={() => setNovo(false)} onSaved={() => { setNovo(false); carregar(); }}
        />
      )}
    </div>
  );
}

function DiaColuna({ ymd, ags, nomeServico, onChange }: {
  ymd: string; ags: Agendamento[]; nomeServico: (id: string | null) => string; onChange: () => void;
}) {
  const doDia = ags.filter((a) => partes(a.inicio).ymd === ymd);
  return (
    <div className="relative border-l border-black/10" style={{ height: (HORA_FIM - HORA_INI) * PX_HORA }}>
      {Array.from({ length: HORA_FIM - HORA_INI }, (_, i) => (
        <div key={i} className="border-b border-black/5" style={{ height: PX_HORA }} />
      ))}
      {doDia.map((a) => {
        const p = partes(a.inicio);
        const durMin = Math.max((new Date(a.fim).getTime() - new Date(a.inicio).getTime()) / 60000, 20);
        const top = ((p.hh + p.mm / 60) - HORA_INI) * PX_HORA;
        const alt = (durMin / 60) * PX_HORA;
        if (top < 0 || p.hh >= HORA_FIM) return null;
        return (
          <button key={a.id} onClick={() => { if (confirm("Cancelar este agendamento?")) api.atualizarAgendamento(a.id, { status: "cancelado" }).then(onChange); }}
            className="absolute left-0.5 right-0.5 overflow-hidden rounded-md border border-brand/30 bg-brand/10 px-1.5 py-1 text-left text-[10px] leading-tight text-brand-dark hover:bg-brand/20"
            style={{ top, height: alt }}>
            <div className="font-semibold">{horaClinic(a.inicio)}</div>
            <div className="truncate">{a.cliente_nome || "Cliente"}</div>
            {nomeServico(a.servico_id) && <div className="truncate text-brand/70">{nomeServico(a.servico_id)}</div>}
          </button>
        );
      })}
    </div>
  );
}

function ModalNovo({ profs, servicos, profIdInicial, onClose, onSaved }: {
  profs: Profissional[]; servicos: Servico[]; profIdInicial: string; onClose: () => void; onSaved: () => void;
}) {
  const [profId, setProfId] = useState(profIdInicial);
  const [servicoId, setServicoId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<string>("");
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const prof = profs.find((p) => p.id === profId);
  const servicosDoProf = servicos.filter((s) => prof?.servico_ids.includes(s.id));

  useEffect(() => {
    if (!profId) return;
    setCarregandoSlots(true); setSlot("");
    api.disponibilidade(servicoId || undefined, profId)
      .then(setSlots).catch(() => setSlots([])).finally(() => setCarregandoSlots(false));
  }, [profId, servicoId]);

  const slotsPorDia = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const dia = _fmtDia.format(new Date(s.inicio_iso));
      const arr = m.get(dia) ?? [];
      arr.push(s); m.set(dia, arr);
    }
    return Array.from(m.entries());
  }, [slots]);

  async function salvar() {
    if (!slot || !profId || salvando) return;
    setSalvando(true); setErro(null);
    try {
      await api.criarAgendamento({
        profissional_id: profId, servico_id: servicoId || undefined, inicio: slot,
        cliente_nome: nome || undefined, contato: contato || undefined,
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e)); setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold">Novo agendamento</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-black/40 hover:text-ink"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black/55">Profissional</label>
              <select value={profId} onChange={(e) => setProfId(e.target.value)} aria-label="Profissional" className={inputCls}>
                {profs.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black/55">Serviço</label>
              <select value={servicoId} onChange={(e) => setServicoId(e.target.value)} aria-label="Serviço" className={inputCls}>
                <option value="">Avaliação (30 min)</option>
                {servicosDoProf.map((s) => <option key={s.id} value={s.id}>{s.nome} ({s.duracao_min}min)</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-black/55">Horário disponível</label>
            {carregandoSlots ? (
              <p className="py-4 text-center text-sm text-black/40"><Loader2 size={15} className="inline animate-spin" /> calculando…</p>
            ) : slots.length === 0 ? (
              <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">Sem horários livres — verifique a escala do profissional.</p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-auto rounded-lg border border-black/10 p-2">
                {slotsPorDia.map(([dia, lista]) => (
                  <div key={dia}>
                    <div className="mb-1 text-[11px] font-semibold capitalize text-black/45">{dia}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {lista.map((s) => {
                        const on = slot === s.inicio_iso;
                        return (
                          <button key={s.inicio_iso} onClick={() => setSlot(s.inicio_iso)}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition ${on ? "bg-brand text-white" : "border border-black/15 text-black/60 hover:bg-black/[0.03]"}`}>
                            {horaClinic(s.inicio_iso)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black/55">Nome do cliente</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-black/55">Contato</label>
              <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="WhatsApp/telefone" className={inputCls} />
            </div>
          </div>
          {erro && <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-black/10 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">Cancelar</button>
          <button onClick={salvar} disabled={salvando || !slot}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
            {salvando ? "Salvando…" : "Agendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
