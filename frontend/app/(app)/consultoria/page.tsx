"use client";

import { useEffect, useState } from "react";
import { api, type Relatorio } from "@/lib/api";
import { useT } from "@/components/i18n-context";

export default function ConsultoriaPage() {
  const t = useT().consultoria;
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
        <h1 className="text-xl font-semibold">{t.titulo}</h1>
        <p className="text-sm text-black/50">
          {t.subtitulo}
        </p>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
      {loading && <p className="text-sm text-black/40">{t.carregando}</p>}

      {!loading && !ultimo && (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          {t.vazio}
        </div>
      )}

      {ultimo && (
        <article className="rounded-2xl border border-black/10 bg-white p-7 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-medium text-white">
              {t.maisRecente}
            </span>
            <span className="text-xs text-black/40">
              {ultimo.periodo_inicio} → {ultimo.periodo_fim}
            </span>
          </div>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <Metric label={t.leads} value={ultimo.leads_totais} />
            <Metric label={t.conversao} value={`${ultimo.taxa_conversao_lead_agendamento ?? 0}%`} />
            <Metric label={t.reunioes} value={ultimo.reunioes_agendadas} />
          </div>
          <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink">
            {ultimo.relatorio_whatsapp}
          </div>
        </article>
      )}

      {anteriores.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-black/50">{t.anteriores}</h2>
          <div className="space-y-2">
            {anteriores.map((r) => (
              <details key={r.id} className="rounded-xl border border-black/10 bg-white/60 p-4">
                <summary className="cursor-pointer text-sm">
                  <span className="font-medium">
                    {r.periodo_inicio} → {r.periodo_fim}
                  </span>
                  <span className="ml-2 text-black/40">
                    · {r.leads_totais} {t.leadsSuf} · {r.reunioes_agendadas} {t.reunioesSuf}
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
