"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { api, type Projeto } from "@/lib/api";
import { agenteInfo } from "@/lib/agentes";

export default function ProjetoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proj, setProj] = useState<Projeto | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.projeto(id).then(setProj).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (erro) return <div className="p-6"><p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p></div>;
  if (!proj) return <div className="p-6 text-sm text-black/40">Carregando…</div>;

  return (
    <div className="p-6">
      <button onClick={() => router.push("/gestao")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-black/50 hover:text-ink">
        <ArrowLeft size={15} /> Voltar para Gestão
      </button>

      <header className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><FolderKanban size={20} /></span>
        <div>
          <h1 className="text-xl font-semibold">{proj.nome}</h1>
          {proj.descricao && <p className="text-sm text-black/50">{proj.descricao}</p>}
        </div>
      </header>

      {/* Abas (placeholder Fase 1 → preenchidas na Fase 2) */}
      <div className="mb-4 flex gap-1 border-b border-black/10">
        {["Agentes", "Contexto", "Fluxo"].map((t, i) => (
          <span key={t} className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium ${i === 0 ? "border-brand text-brand" : "border-transparent text-black/40"}`}>{t}</span>
        ))}
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-black/50">Time de agentes deste projeto</div>
        <div className="flex flex-wrap gap-2">
          {proj.agente_ids.length === 0 && <span className="text-xs text-black/40">Nenhum agente neste projeto.</span>}
          {proj.agente_ids.map((aid) => {
            const info = agenteInfo(aid);
            const Ico = info?.icon;
            return (
              <span key={aid} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-medium">
                {Ico && <Ico size={14} className={info?.cor} />} {info?.nome ?? aid}
              </span>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-black/15 bg-white p-6 text-center text-sm text-black/45">
        <strong>Workspace do projeto — em construção (Fase 2).</strong>
        <p className="mt-1">Aqui vão as abas <em>Agentes</em> (chat por agente com o contexto do projeto), <em>Contexto</em> (briefing + documentos) e <em>Fluxo</em> (diagrama).</p>
      </div>
    </div>
  );
}
