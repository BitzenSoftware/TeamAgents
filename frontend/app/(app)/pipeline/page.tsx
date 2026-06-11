"use client";

import { useCallback, useEffect, useState } from "react";
import { useCliente } from "@/components/cliente-context";
import { api, type Conversa, type Lead, type StatusQualificacao } from "@/lib/api";

const COLUNAS: { status: StatusQualificacao; label: string; cor: string }[] = [
  { status: "FRIO", label: "Frio", cor: "bg-slate-100 text-slate-700" },
  { status: "EM_ANDAMENTO", label: "Em andamento", cor: "bg-amber-100 text-amber-800" },
  { status: "QUALIFICADO", label: "Qualificado", cor: "bg-emerald-100 text-emerald-800" },
  { status: "DESQUALIFICADO", label: "Desqualificado", cor: "bg-rose-100 text-rose-700" },
];

export default function PipelinePage() {
  const { cliente } = useCliente();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<Lead | null>(null);

  const carregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    api
      .leads()
      .then(setLeads)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="p-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pipeline Comercial</h1>
          <p className="text-sm text-black/50">Leads atendidos e qualificados automaticamente pelo seu SDR</p>
        </div>
        <button
          onClick={carregar}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
        >
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUNAS.map((col) => {
          const doStatus = leads.filter((l) => l.status_qualificacao === col.status);
          return (
            <section key={col.status} className="rounded-xl border border-black/10 bg-white/60 p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${col.cor}`}>
                  {col.label}
                </span>
                <span className="text-xs text-black/40">{doStatus.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {doStatus.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setAberto(lead)}
                    className="rounded-lg border border-black/10 bg-white p-3 text-left transition hover:border-ink/40 hover:shadow-sm"
                  >
                    <div className="font-medium">{lead.nome ?? lead.whatsapp}</div>
                    <div className="text-xs text-black/50">{lead.whatsapp}</div>
                    <div className="mt-1 flex gap-1">
                      {lead.reuniao_agendada && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                          reunião 🚀
                        </span>
                      )}
                      {lead.transferido_humano && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                          → humano
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {doStatus.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-black/30">vazio</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {aberto && <ConversaDrawer lead={aberto} onClose={() => setAberto(null)} />}
    </div>
  );
}

function ConversaDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .conversas(lead.id)
      .then(setMsgs)
      .finally(() => setLoading(false));
  }, [lead.id]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/20" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-black/10 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">{lead.nome ?? lead.whatsapp}</div>
              <div className="text-xs text-black/50">{lead.whatsapp}</div>
            </div>
            <button onClick={onClose} className="text-black/40 hover:text-ink">
              ✕
            </button>
          </div>
          {lead.maior_gargalo && (
            <p className="mt-2 text-xs text-black/60">
              <span className="font-medium">Gargalo:</span> {lead.maior_gargalo}
            </p>
          )}
        </header>
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {loading && <p className="text-sm text-black/40">Carregando conversa…</p>}
          {!loading && msgs.length === 0 && (
            <p className="text-sm text-black/40">Sem mensagens ainda.</p>
          )}
          {msgs.map((m, i) => {
            const doLead = m.autor === "LEAD";
            return (
              <div key={i} className={`flex ${doLead ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    doLead ? "bg-white border border-black/10" : "bg-brand text-white"
                  }`}
                >
                  {m.mensagem}
                  <div className={`mt-1 text-[10px] ${doLead ? "text-black/30" : "text-white/40"}`}>
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
