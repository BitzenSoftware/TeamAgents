"use client";

import { useEffect, useState } from "react";
import { api, type Relatorio } from "@/lib/api";

export default function ConsultoriaPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErro(null);
    api
      .relatorios()
      .then(setRelatorios)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  const ultimo = relatorios[0];
  const anteriores = relatorios.slice(1);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-xl font-semibold">Feed de Consultoria</h1>
        <p className="text-sm text-black/50">
          Análise estratégica semanal do Diretor de BI (Opus 4.8)
        </p>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
      {loading && <p className="text-sm text-black/40">A carregar…</p>}

      {!loading && !ultimo && (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Ainda não há relatórios. O primeiro chega no próximo ciclo semanal do cron de BI.
        </div>
      )}

      {ultimo && (
        <article className="rounded-2xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-white">
              Mais recente
            </span>
            <span className="text-xs text-black/40">
              {ultimo.periodo_inicio} → {ultimo.periodo_fim}
            </span>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <Metric label="Leads" value={ultimo.leads_totais} />
            <Metric label="Conversão" value={`${ultimo.taxa_conversao_lead_agendamento ?? 0}%`} />
            <Metric label="Reuniões" value={ultimo.reunioes_agendadas} />
          </div>
          <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink">
            {ultimo.relatorio_whatsapp}
          </div>
        </article>
      )}

      {anteriores.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-black/50">Relatórios anteriores</h2>
          <div className="space-y-2">
            {anteriores.map((r) => (
              <details key={r.id} className="rounded-xl border border-black/10 bg-white/60 p-4">
                <summary className="cursor-pointer text-sm">
                  <span className="font-medium">
                    {r.periodo_inicio} → {r.periodo_fim}
                  </span>
                  <span className="ml-2 text-black/40">
                    · {r.leads_totais} leads · {r.reunioes_agendadas} reuniões
                  </span>
                </summary>
                <div className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed text-black/80">
                  {r.relatorio_whatsapp}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-paper p-3 text-center">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-black/40">{label}</div>
    </div>
  );
}
