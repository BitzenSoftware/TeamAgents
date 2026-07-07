"use client";

import { useCallback, useEffect, useState } from "react";
import { useCliente } from "@/components/cliente-context";
import { useLocale, useT } from "@/components/i18n-context";
import { api, type Conversa, type Lead, type StatusQualificacao } from "@/lib/api";

const COLUNAS: { status: StatusQualificacao; cor: string }[] = [
  { status: "FRIO", cor: "bg-slate-100 text-slate-700" },
  { status: "EM_ANDAMENTO", cor: "bg-amber-100 text-amber-800" },
  { status: "QUALIFICADO", cor: "bg-emerald-100 text-emerald-800" },
  { status: "DESQUALIFICADO", cor: "bg-rose-100 text-rose-700" },
];

export default function PipelinePage() {
  const { cliente } = useCliente();
  const t = useT().pipeline;
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
          <h1 className="text-xl font-semibold">{t.titulo}</h1>
          <p className="text-sm text-black/50">{t.subtitulo}</p>
        </div>
        <button
          onClick={carregar}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
        >
          {loading ? t.atualizando : t.atualizar}
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
                  {t.colunas[col.status] ?? col.status}
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
                          {t.badgeReuniao}
                        </span>
                      )}
                      {lead.transferido_humano && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">
                          {t.badgeHumano}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
                {doStatus.length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-black/30">{t.vazio}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {aberto && <ConversaDrawer lead={aberto} onClose={() => setAberto(null)} onChange={carregar} />}
    </div>
  );
}

function ConversaDrawer({ lead, onClose, onChange }: { lead: Lead; onClose: () => void; onChange: () => void }) {
  const { locale } = useLocale();
  const t = useT().pipeline;
  const [msgs, setMsgs] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [reativando, setReativando] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .conversas(lead.id)
      .then(setMsgs)
      .finally(() => setLoading(false));
  }, [lead.id]);

  async function reativarIa() {
    setReativando(true);
    try {
      await api.reativarIaLead(lead.id);
      onChange();
      onClose();
    } catch {
      setReativando(false);
    }
  }

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
              <span className="font-medium">{t.gargalo}</span> {lead.maior_gargalo}
            </p>
          )}
          {lead.transferido_humano && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5">
              <span className="text-[11px] leading-snug text-blue-800">
                {t.humanoAviso}
              </span>
              <button
                type="button"
                onClick={reativarIa}
                disabled={reativando}
                className="shrink-0 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {reativando ? "…" : t.reativarIa}
              </button>
            </div>
          )}
        </header>
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {loading && <p className="text-sm text-black/40">{t.carregandoConversa}</p>}
          {!loading && msgs.length === 0 && (
            <p className="text-sm text-black/40">{t.semMensagens}</p>
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
                    {new Date(m.created_at).toLocaleString(locale === "en" ? "en-US" : "pt-BR")}
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
