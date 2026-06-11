"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type AgenteSkill, type Habilidade } from "@/lib/api";

const AGENTES: { valor: AgenteSkill; label: string }[] = [
  { valor: "global", label: "Global (todos)" },
  { valor: "copywriting", label: "Agente de Copywriting" },
  { valor: "sdr", label: "Agente SDR" },
  { valor: "bi", label: "Agente Diretor de BI" },
  { valor: "assistente", label: "Agente Executivo" },
];

const AGENTE_LABEL: Record<AgenteSkill, string> = Object.fromEntries(
  AGENTES.map((a) => [a.valor, a.label]),
) as Record<AgenteSkill, string>;

export default function HabilidadesPage() {
  const [lista, setLista] = useState<Habilidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modelosAberto, setModelosAberto] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<AgenteSkill | "todos">("todos");

  const listaFiltrada = useMemo(
    () => (filtro === "todos" ? lista : lista.filter((h) => h.agente === filtro)),
    [lista, filtro],
  );

  const carregar = useCallback(() => {
    setLoading(true);
    api
      .habilidades()
      .then(setLista)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Garante uma seleção válida dentro do filtro (auto-seleciona a primeira).
  useEffect(() => {
    if (listaFiltrada.length === 0) {
      setSelId(null);
    } else if (!listaFiltrada.some((h) => h.id === selId)) {
      setSelId(listaFiltrada[0].id);
    }
  }, [listaFiltrada, selId]);

  const selecionada = listaFiltrada.find((h) => h.id === selId) ?? null;

  async function toggle(h: Habilidade) {
    await api.atualizarHabilidade(h.id, { ativo: !h.ativo });
    carregar();
  }

  async function apagar(h: Habilidade) {
    if (!window.confirm(`Apagar a habilidade "${h.titulo}"?`)) return;
    await api.apagarHabilidade(h.id);
    setSelId(null);
    carregar();
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Habilidades</h1>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setModelosAberto(true)}
              className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/10"
            >
              ✨ Modelos de estética
            </button>
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              + Adicionar habilidade
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-black/50">
          O conhecimento da sua empresa. Cada habilidade pertence a um agente (ou é global, usada por
          todos) — ofertas, tom de voz, argumentos, respostas a objeções.
        </p>
        {/* Filtro por agente */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["todos", "global", "copywriting", "sdr", "bi", "assistente"] as (AgenteSkill | "todos")[]).map(
            (v) => {
              const ativo = filtro === v;
              const label = v === "todos" ? "Todos" : AGENTE_LABEL[v];
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFiltro(v)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    ativo ? "bg-brand text-white" : "bg-black/5 text-black/60 hover:bg-black/10"
                  }`}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>
      </header>

      {erro && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      {!loading && lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Ainda não há habilidades. Clique em <strong>“+ Adicionar habilidade”</strong> — quanto mais
          souber a empresa, melhores os anúncios e as conversas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Lista (master) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="mb-2 text-xs font-medium text-black/50">
              {filtro === "todos" ? "Salvas" : AGENTE_LABEL[filtro]}{" "}
              {listaFiltrada.length > 0 && `(${listaFiltrada.length})`}
            </div>
            {loading ? (
              <p className="text-sm text-black/40">Carregando…</p>
            ) : listaFiltrada.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
                Nenhuma habilidade neste agente.
              </p>
            ) : (
              <div className="space-y-1.5">
                {listaFiltrada.map((h) => {
                  const sel = h.id === selId;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelId(h.id)}
                      className={`flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                        sel
                          ? "border-brand/40 bg-brand/10"
                          : "border-black/10 bg-white hover:bg-black/[0.03]"
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={`block break-words ${sel ? "font-semibold text-brand" : "font-medium"}`}>
                          {h.titulo}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-black/40">
                          {AGENTE_LABEL[h.agente]}
                        </span>
                      </span>
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${h.ativo ? "bg-emerald-500" : "bg-black/20"}`}
                        title={h.ativo ? "Ativa" : "Inativa"}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Detalhe (detail) */}
          <section className="md:col-span-8 lg:col-span-9">
            {selecionada ? (
              <Detalhe h={selecionada} onToggle={() => toggle(selecionada)} onApagar={() => apagar(selecionada)} />
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
                Selecione uma habilidade à esquerda para ver o conteúdo.
              </div>
            )}
          </section>
        </div>
      )}

      {modalAberto && (
        <ModalAdicionar
          defaultAgente={filtro === "todos" ? "global" : filtro}
          onClose={() => setModalAberto(false)}
          onSaved={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}

      {modelosAberto && (
        <ModalModelos
          existentes={lista.map((h) => h.titulo)}
          onClose={() => setModelosAberto(false)}
          onChanged={carregar}
        />
      )}
    </div>
  );
}

/* ---------------- Painel de detalhe ---------------- */
function Detalhe({
  h,
  onToggle,
  onApagar,
}: {
  h: Habilidade;
  onToggle: () => void;
  onApagar: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
        <div className="min-w-0">
          <h2 className="min-w-0 break-words text-base font-semibold text-white">{h.titulo}</h2>
          <div className="mt-0.5 text-[11px] text-white/70">{AGENTE_LABEL[h.agente]}</div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            h.ativo ? "bg-white/20 text-white" : "bg-black/20 text-white/80"
          }`}
        >
          {h.ativo ? "Ativa" : "Inativa"}
        </span>
      </div>
      <div className="p-5">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-black/80">{h.conteudo}</p>
        <div className="mt-5 flex gap-2 border-t border-black/5 pt-4">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5"
          >
            {h.ativo ? "Desativar" : "Ativar"}
          </button>
          <button
            type="button"
            onClick={onApagar}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
          >
            Apagar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Modal de criação ---------------- */
function ModalAdicionar({
  defaultAgente,
  onClose,
  onSaved,
}: {
  defaultAgente: AgenteSkill;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [agente, setAgente] = useState<AgenteSkill>(defaultAgente);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) return;
    setSaving(true);
    setErro(null);
    try {
      await api.criarHabilidade(titulo.trim(), conteudo.trim(), agente);
      onSaved();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao salvar");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">Nova habilidade</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            ×
          </button>
        </div>
        <form onSubmit={adicionar} className="space-y-3 p-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-black/50">Agente</span>
            <select
              value={agente}
              onChange={(e) => setAgente(e.target.value as AgenteSkill)}
              className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
            >
              {AGENTES.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título — ex: Nossa oferta principal"
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Conteúdo — ex: Fazemos a contabilidade completa por R$499/mês, com garantia de resposta em 24h. Diferencial: app próprio e contador dedicado."
            className="h-36 w-full resize-none rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
          />
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Salvando…" : "Adicionar habilidade"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Modelos prontos para clínicas de estética ---------------- */
type Modelo = { titulo: string; agente: AgenteSkill; conteudo: string };

const TEMPLATES_ESTETICA: Modelo[] = [
  {
    titulo: "Tom de voz da clínica",
    agente: "global",
    conteudo:
      "Fale de forma acolhedora, próxima e segura, tratando a paciente por \"você\". Use no máximo 1 emoji por mensagem. NUNCA prometa resultado garantido nem faça diagnóstico pelo WhatsApp — o resultado depende de avaliação presencial. Não passe preço fechado sem avaliação; quando perguntarem valores, fale \"a partir de\" e convide para a avaliação. Seja breve (2 a 3 frases). [Edite com o nome e a personalidade da sua clínica.]",
  },
  {
    titulo: "Roteiro de qualificação (perguntas padrão)",
    agente: "sdr",
    conteudo:
      "Ao receber uma cliente nova, conduza a conversa nesta ordem, uma pergunta de cada vez:\n1) Acolha pelo nome e pergunte qual procedimento ou incômodo ela quer resolver.\n2) Pergunte se já fez esse procedimento antes ou se seria a primeira vez.\n3) Entenda a urgência/ocasião (evento, casamento, só pesquisando).\n4) Explique em 1 frase como funciona e tranquilize a principal dúvida.\n5) Ofereça a AVALIAÇÃO como próximo passo e proponha 2 horários concretos.\nObjetivo final: agendar a avaliação. Se a cliente pedir para falar com humano ou for um caso clínico delicado, transfira.",
  },
  {
    titulo: "Procedimentos, valores e objeções",
    agente: "sdr",
    conteudo:
      "Tabela de referência (edite com os seus valores reais):\n• Preenchimento labial — a partir de R$ 1.200 · dura 8–12 meses\n• Botox (toxina) — a partir de R$ 900 · dura 4–6 meses\n• Harmonização facial — sob avaliação\n• Limpeza de pele — a partir de R$ 180\n\nObjeções:\n• \"Tá caro\": divida pela durabilidade (ex.: R$ 1.200 por ~10 meses) e ofereça parcelamento.\n• \"Dói?\": explique o anestésico/conforto e a experiência da profissional.\n• \"É seguro?\": reforce que é feito por profissional habilitada, com produto registrado.\n• \"Vou pensar\": ofereça a avaliação gratuita, sem compromisso, para tirar todas as dúvidas.",
  },
  {
    titulo: "Política de agendamento e avaliação",
    agente: "sdr",
    conteudo:
      "A avaliação é [gratuita/R$ X] e sem compromisso. Para confirmar, peça nome completo e o melhor dia/horário. Reforce o endereço e oriente chegar 10 min antes. Em caso de remarcação, peça aviso com [24h] de antecedência. Horário de atendimento: [seg–sáb, 9h–19h]. [Edite com as regras reais da sua clínica.]",
  },
  {
    titulo: "Estilo dos anúncios da clínica",
    agente: "copywriting",
    conteudo:
      "Os anúncios devem focar em autoestima e no resultado desejado (sentir-se bem, natural, renovada), nunca em medo ou em promessa absoluta. Evite \"cura\", \"garantido\", \"100%\". Sempre termine com CTA para chamar no WhatsApp. Respeite o conselho de classe: nada de antes/depois proibido e nada de prometer resultado. Tom: elegante, acolhedor e confiante. [Edite com os diferenciais e o público da sua clínica.]",
  },
  {
    titulo: "O que destacar nos emails de fornecedores",
    agente: "assistente",
    conteudo:
      "Ao resumir emails de fornecedores e administrativos, priorize: entregas de toxina e preenchedores (data e confirmação), validade dos lotes, boletos a vencer e valores a conferir, convênios e parcerias, e qualquer pendência que trave a agenda. Liste como ações com prazo. Ignore newsletters e propaganda sem ação.",
  },
];

function ModalModelos({
  existentes,
  onClose,
  onChanged,
}: {
  existentes: string[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const jaTem = useMemo(() => new Set(existentes.map((t) => t.toLowerCase())), [existentes]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function presente(m: Modelo) {
    return jaTem.has(m.titulo.toLowerCase()) || added.has(m.titulo);
  }

  async function adicionar(m: Modelo) {
    setBusy(m.titulo);
    setErro(null);
    try {
      await api.criarHabilidade(m.titulo, m.conteudo, m.agente);
      setAdded((s) => new Set(s).add(m.titulo));
      onChanged();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao adicionar");
    } finally {
      setBusy(null);
    }
  }

  async function adicionarTodos() {
    for (const m of TEMPLATES_ESTETICA) {
      if (!presente(m)) await adicionar(m);
    }
  }

  const faltam = TEMPLATES_ESTETICA.filter((m) => !presente(m)).length;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">✨ Modelos de estética</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">×</button>
        </div>
        <div className="border-b border-black/5 px-5 py-3">
          <p className="text-xs leading-relaxed text-black/55">
            Habilidades prontas para clínicas de estética. Adicione as que fizerem sentido e
            depois <strong>edite com os valores e o jeito da sua clínica</strong> — elas já vêm ativas.
          </p>
        </div>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
          {TEMPLATES_ESTETICA.map((m) => {
            const ok = presente(m);
            return (
              <div key={m.titulo} className="rounded-xl border border-black/10 p-3.5">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{m.titulo}</span>
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/50">
                    {AGENTE_LABEL[m.agente]}
                  </span>
                </div>
                <p className="mb-2.5 line-clamp-2 whitespace-pre-wrap text-xs text-black/45">{m.conteudo}</p>
                <button
                  type="button"
                  onClick={() => adicionar(m)}
                  disabled={ok || busy === m.titulo}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    ok
                      ? "cursor-default bg-emerald-50 text-emerald-700"
                      : "bg-brand text-white hover:opacity-90 disabled:opacity-40"
                  }`}
                >
                  {ok ? "✓ Adicionada" : busy === m.titulo ? "Adicionando…" : "Adicionar"}
                </button>
              </div>
            );
          })}
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-black/5 px-5 py-3">
          <span className="text-xs text-black/40">{faltam > 0 ? `${faltam} por adicionar` : "Tudo adicionado ✓"}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
              Fechar
            </button>
            <button
              type="button"
              onClick={adicionarTodos}
              disabled={faltam === 0 || busy !== null}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Adicionar todos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
