"use client";

import { useEffect, useRef, useState } from "react";

export type EtapaAgente = {
  id: string;
  robo: string; // emoji da "carinha"
  titulo: string;
  legenda: string;
  cor: string; // cor de destaque (hex)
  paralelo?: boolean; // mostra vários robôs (workers)
};

// Pipeline real do Agente Executivo: orquestrador (Opus) → workers (Haiku) → síntese.
export const ETAPAS_EXECUTIVO: EtapaAgente[] = [
  { id: "plan", robo: "🤖", titulo: "Orquestrador", legenda: "A analisar e planear a tarefa", cor: "#4f46e5" },
  { id: "work", robo: "🤖", titulo: "Workers", legenda: "A processar os emails em paralelo", cor: "#16a34a", paralelo: true },
  { id: "synth", robo: "🤖", titulo: "Síntese", legenda: "A consolidar a síntese executiva", cor: "#d97706" },
  { id: "done", robo: "✅", titulo: "Concluído", legenda: "Tudo pronto!", cor: "#059669" },
];

/**
 * Mostra um fluxo animado de sub-agentes enquanto `ativo`. Quando `ativo` passa
 * a falso (operação terminou), salta para "Concluído" e desaparece após ~1.6s.
 */
export function FluxoAgentes({
  ativo,
  etapas = ETAPAS_EXECUTIVO,
}: {
  ativo: boolean;
  etapas?: EtapaAgente[];
}) {
  const ultimoTrabalho = etapas.length - 2; // última etapa "a trabalhar" (síntese)
  const concluidoIdx = etapas.length - 1;
  const [fase, setFase] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const eraAtivo = useRef(false);

  useEffect(() => {
    if (ativo) {
      if (!eraAtivo.current) {
        eraAtivo.current = true;
        setVisivel(true);
        setFase(0);
      }
      const id = setInterval(() => setFase((f) => Math.min(f + 1, ultimoTrabalho)), 1600);
      return () => clearInterval(id);
    }
    if (eraAtivo.current) {
      eraAtivo.current = false;
      setFase(concluidoIdx);
      const t = setTimeout(() => setVisivel(false), 1600);
      return () => clearTimeout(t);
    }
  }, [ativo, ultimoTrabalho, concluidoIdx]);

  if (!visivel) return null;

  const etapaAtual = etapas[Math.min(fase, etapas.length - 1)];

  return (
    <div className="fa-wrap mx-4 my-3 overflow-hidden rounded-xl border border-black/10 bg-gradient-to-br from-white to-black/[0.02] p-4">
      <div className="flex items-center justify-between">
        {etapas.map((e, i) => {
          const estado = i < fase ? "done" : i === fase ? "ativo" : "pendente";
          return (
            <div key={e.id} className="flex flex-1 items-center last:flex-none">
              <Node etapa={e} estado={estado} />
              {i < etapas.length - 1 && (
                <div className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-black/10 sm:mx-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: i < fase ? "100%" : "0%", background: e.cor }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-sm font-medium text-ink">
        {etapaAtual.titulo}
        <span className="ml-1 font-normal text-black/45">— {etapaAtual.legenda}</span>
        {fase < concluidoIdx && <span className="fa-dots ml-0.5 text-black/40" />}
      </p>

      <style>{`
        @keyframes fa-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes fa-pulse { 0%{box-shadow:0 0 0 0 var(--c)} 70%{box-shadow:0 0 0 9px transparent} 100%{box-shadow:0 0 0 0 transparent} }
        @keyframes fa-pop { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes fa-blink { 0%,100%{opacity:.25} 50%{opacity:1} }
        .fa-ativo { animation: fa-pulse 1.4s ease-out infinite; }
        .fa-ativo .fa-face { animation: fa-bounce .9s ease-in-out infinite; display:inline-block; }
        .fa-mini { animation: fa-blink 1s ease-in-out infinite; }
        .fa-dots::after { content:'…'; animation: fa-blink 1.2s steps(1) infinite; }
      `}</style>
    </div>
  );
}

function Node({ etapa, estado }: { etapa: EtapaAgente; estado: "pendente" | "ativo" | "done" }) {
  const ativo = estado === "ativo";
  const done = estado === "done";
  const cor = etapa.cor;

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div
        className={`relative grid h-11 w-11 place-items-center rounded-full text-xl transition-all ${ativo ? "fa-ativo" : ""}`}
        style={{
          // cor do anel de pulso
          ["--c" as string]: `${cor}66`,
          background: ativo ? `${cor}1f` : done ? `${cor}1a` : "rgba(0,0,0,.05)",
          border: `2px solid ${ativo || done ? cor : "transparent"}`,
          filter: estado === "pendente" ? "grayscale(1) opacity(.55)" : "none",
        }}
      >
        {done && etapa.id !== "done" ? (
          <span className="text-emerald-600" style={{ animation: "fa-pop .4s ease-out" }}>✓</span>
        ) : etapa.paralelo && ativo ? (
          <span className="flex gap-0.5 text-[11px]">
            <span className="fa-mini" style={{ animationDelay: "0ms" }}>🤖</span>
            <span className="fa-mini" style={{ animationDelay: "200ms" }}>🤖</span>
            <span className="fa-mini" style={{ animationDelay: "400ms" }}>🤖</span>
          </span>
        ) : (
          <span className="fa-face">{etapa.robo}</span>
        )}
      </div>
      <span
        className="text-[10px] font-medium"
        style={{ color: ativo || done ? cor : "rgba(0,0,0,.4)" }}
      >
        {etapa.titulo}
      </span>
    </div>
  );
}
