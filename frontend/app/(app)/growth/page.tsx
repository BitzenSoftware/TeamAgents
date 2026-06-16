"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Building2, CalendarCheck, Copy, Loader2, Send, Settings2,
  Sparkles, Trash2, Check,
} from "lucide-react";
import {
  api, SUPERADMIN_EMAIL,
  type GrowthBriefingSalvo, type GrowthConfig, type GrowthMensagem, type GrowthPost,
} from "@/lib/api";
import { useAuth } from "@/components/auth-context";

type Aba = "comando" | "vendas" | "posts" | "config";

const ABAS: { id: Aba; label: string; icon: typeof Briefcase }[] = [
  { id: "comando", label: "Sala de Comando", icon: Building2 },
  { id: "vendas", label: "Vendas (Coach)", icon: Briefcase },
  { id: "posts", label: "Conteúdo & Aprovações", icon: CalendarCheck },
  { id: "config", label: "Configurações", icon: Settings2 },
];

export default function GrowthPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
  const [aba, setAba] = useState<Aba>("comando");

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/pipeline");
  }, [authLoading, isAdmin, router]);

  if (!authLoading && !isAdmin) return null;

  return (
    <div className="p-6">
      <header className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm">
            <Sparkles size={18} />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Growth — sua diretoria de IA</h1>
            <p className="text-sm text-black/50">Equipe privada de marketing e vendas para vender o TeamAgents.</p>
          </div>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap gap-1.5 border-b border-black/10">
        {ABAS.map(({ id, label, icon: Ico }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2 text-sm font-medium transition ${
              aba === id ? "border-brand text-brand" : "border-transparent text-black/50 hover:text-ink"
            }`}
          >
            <Ico size={16} /> {label}
          </button>
        ))}
      </div>

      {aba === "comando" && <SalaDeComando />}
      {aba === "vendas" && <Coach />}
      {aba === "posts" && <Conteudo />}
      {aba === "config" && <Config />}
    </div>
  );
}

/* ============================ Sala de Comando ============================ */
type EtapaStatus = "pendente" | "rodando" | "ok" | "erro";
type Etapa = {
  chave: string;
  titulo: string;
  subtitulo?: string;
  status: EtapaStatus;
  conteudo?: string;
};

function etapasDeBriefing(b: GrowthBriefingSalvo): Etapa[] {
  const es: Etapa[] = [
    { chave: "ceo-plano", titulo: "CEO — leitura estratégica", status: "ok", conteudo: b.leitura_estrategica },
  ];
  b.entregaveis.forEach((e, i) =>
    es.push({ chave: `dir-${e.diretor || i}`, titulo: e.diretor_nome, subtitulo: e.foco, status: "ok", conteudo: e.conteudo }),
  );
  if (b.briefing) es.push({ chave: "ceo-sintese", titulo: "CEO — briefing executivo", status: "ok", conteudo: b.briefing });
  return es;
}

function SalaDeComando() {
  const [objetivo, setObjetivo] = useState("");
  const [rodando, setRodando] = useState(false);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [tituloFluxo, setTituloFluxo] = useState("Fluxo de trabalho da diretoria");
  const [erro, setErro] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<GrowthBriefingSalvo[]>([]);
  const [selId, setSelId] = useState<string | null>(null);

  const carregarSalvos = useCallback(() => { api.growthBriefings().then(setSalvos).catch(() => {}); }, []);
  useEffect(() => { carregarSalvos(); }, [carregarSalvos]);

  const patchEtapa = (chave: string, patch: Partial<Etapa>) =>
    setEtapas((es) => es.map((e) => (e.chave === chave ? { ...e, ...patch } : e)));

  async function acionar() {
    const o = objetivo.trim();
    if (!o || rodando) return;
    setRodando(true);
    setErro(null);
    setSelId(null);
    setTituloFluxo("Fluxo de trabalho da diretoria");
    setEtapas([{ chave: "ceo-plano", titulo: "CEO — leitura estratégica", status: "rodando" }]);

    try {
      // 1) CEO planeja e escolhe os diretores.
      const plano = await api.growthPlano(o);
      patchEtapa("ceo-plano", { status: "ok", conteudo: plano.leitura_estrategica });

      const dirEtapas: Etapa[] = plano.diretivas.map((d) => ({
        chave: `dir-${d.diretor}`, titulo: d.diretor_nome, subtitulo: d.foco, status: "pendente",
      }));
      const sinteseEtapa: Etapa = { chave: "ceo-sintese", titulo: "CEO — briefing executivo", status: "pendente" };
      setEtapas((es) => [...es, ...dirEtapas, sinteseEtapa]);

      // 2) Cada diretor entrega, um a um.
      const entregaveis: { diretor: string; diretor_nome: string; foco: string; conteudo: string }[] = [];
      for (const d of plano.diretivas) {
        patchEtapa(`dir-${d.diretor}`, { status: "rodando" });
        const { conteudo } = await api.growthDiretor(d.diretor, d.foco, o);
        patchEtapa(`dir-${d.diretor}`, { status: "ok", conteudo });
        entregaveis.push({ diretor: d.diretor, diretor_nome: d.diretor_nome, foco: d.foco, conteudo });
      }

      // 3) CEO consolida.
      let briefing = "";
      if (entregaveis.length > 0) {
        patchEtapa("ceo-sintese", { status: "rodando" });
        const r = await api.growthSintese(o, entregaveis.map((e) => ({ diretor_nome: e.diretor_nome, conteudo: e.conteudo })));
        briefing = r.briefing;
        patchEtapa("ceo-sintese", { status: "ok", conteudo: briefing });
      } else {
        setEtapas((es) => es.filter((e) => e.chave !== "ceo-sintese"));
      }

      // 4) Persiste o planejamento e atualiza a lista lateral.
      try {
        const salvo = await api.growthSalvarBriefing({
          objetivo: o, leitura_estrategica: plano.leitura_estrategica, entregaveis, briefing,
        });
        setSelId(salvo.id);
        carregarSalvos();
      } catch { /* não bloqueia o resultado já exibido */ }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEtapas((es) => es.map((x) => (x.status === "rodando" ? { ...x, status: "erro" } : x)));
    } finally {
      setRodando(false);
    }
  }

  function abrirSalvo(b: GrowthBriefingSalvo) {
    setSelId(b.id);
    setErro(null);
    setTituloFluxo(b.objetivo);
    setEtapas(etapasDeBriefing(b));
  }

  async function apagarSalvo(id: string) {
    if (!confirm("Apagar este planejamento?")) return;
    await api.growthApagarBriefing(id);
    if (selId === id) { setEtapas([]); setSelId(null); }
    carregarSalvos();
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Coluna principal: objetivo + fluxo */}
      <div className="space-y-4 lg:col-span-8">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <label className="mb-1.5 block text-sm font-medium">Qual o objetivo?</label>
          <p className="mb-2 text-xs text-black/45">
            O CEO faz a leitura estratégica, aciona os diretores certos (Marketing, Comercial, Projetos) e
            devolve um briefing executivo. Ex.: <em>&quot;Quero conseguir 10 clínicas-piloto em 90 dias&quot;</em>.
          </p>
          <textarea
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            rows={3}
            placeholder="Descreva o objetivo…"
            disabled={rodando}
            className="w-full resize-none rounded-lg border border-black/15 p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-black/[0.02]"
          />
          <button
            type="button"
            onClick={acionar}
            disabled={rodando || !objetivo.trim()}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {rodando ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
            {rodando ? "A diretoria está trabalhando…" : "Acionar a diretoria"}
          </button>
          {erro && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
        </div>

        {etapas.length > 0 && (
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="mb-3 truncate text-xs font-semibold uppercase tracking-wider text-black/35">{tituloFluxo}</div>
            <ol className="space-y-1">
              {etapas.map((e, i) => (
                <EtapaItem key={e.chave} etapa={e} ultimo={i === etapas.length - 1} />
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Coluna lateral: planejamentos salvos */}
      <aside className="lg:col-span-4">
        <div className="sticky top-4">
          <div className="mb-2 text-xs font-medium text-black/50">Planejamentos salvos ({salvos.length})</div>
          {salvos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">
              Seus planejamentos ficam salvos aqui.
            </p>
          ) : (
            <div className="space-y-1.5">
              {salvos.map((b) => {
                const ativo = b.id === selId;
                return (
                  <div
                    key={b.id}
                    className={`group flex items-start gap-2 rounded-lg border px-3 py-2.5 transition ${
                      ativo ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"
                    }`}
                  >
                    <button type="button" onClick={() => abrirSalvo(b)} className="min-w-0 flex-1 text-left">
                      <div className={`line-clamp-2 text-sm ${ativo ? "font-semibold text-brand" : "font-medium"}`}>{b.objetivo}</div>
                      <div className="mt-0.5 text-[11px] text-black/40">
                        {new Date(b.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-label="Apagar planejamento"
                      onClick={() => apagarSalvo(b.id)}
                      className="shrink-0 rounded p-1 text-black/30 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function EtapaItem({ etapa, ultimo }: { etapa: Etapa; ultimo: boolean }) {
  const [aberto, setAberto] = useState(false);
  const destaque = etapa.chave === "ceo-sintese";
  return (
    <li className="relative pl-8">
      {/* linha conectora */}
      {!ultimo && <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-black/10" />}
      {/* marcador de status */}
      <span className="absolute left-0 top-0.5 grid h-6 w-6 place-items-center rounded-full border bg-white">
        {etapa.status === "ok" ? (
          <Check size={13} className="text-emerald-600" />
        ) : etapa.status === "rodando" ? (
          <Loader2 size={13} className="animate-spin text-brand" />
        ) : etapa.status === "erro" ? (
          <span className="text-xs font-bold text-rose-600">!</span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-black/25" />
        )}
      </span>

      <div className="pb-3">
        <button
          type="button"
          onClick={() => etapa.conteudo && setAberto((v) => !v)}
          className={`flex w-full items-center gap-2 text-left ${etapa.conteudo ? "cursor-pointer" : "cursor-default"}`}
        >
          <span className={`text-sm font-semibold ${etapa.status === "pendente" ? "text-black/40" : "text-ink"}`}>
            {etapa.titulo}
          </span>
          {etapa.status === "rodando" && <span className="text-[11px] text-brand">trabalhando…</span>}
          {etapa.conteudo && (
            <span className="ml-auto text-[11px] text-black/40">{aberto ? "ocultar" : "ver"}</span>
          )}
        </button>
        {etapa.subtitulo && <div className="mt-0.5 text-xs italic text-black/45">{etapa.subtitulo}</div>}
        {etapa.conteudo && aberto && (
          <div
            className={`mt-2 rounded-lg p-3 text-sm leading-relaxed ${
              destaque ? "border-2 border-brand/30 bg-brand/[0.04] text-ink" : "bg-paper text-black/80"
            }`}
          >
            {destaque && <div className="mb-1.5 text-xs font-bold text-brand">🎯 Briefing executivo</div>}
            <p className="whitespace-pre-wrap">{etapa.conteudo}</p>
          </div>
        )}
        {destaque && etapa.status === "ok" && !aberto && (
          <button type="button" onClick={() => setAberto(true)} className="mt-1 text-xs font-medium text-brand">
            Abrir briefing executivo →
          </button>
        )}
      </div>
    </li>
  );
}

/* ============================ Coach de Vendas ============================ */
function Coach() {
  const [msgs, setMsgs] = useState<GrowthMensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, enviando]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviando) return;
    const historico: GrowthMensagem[] = [...msgs, { role: "user", content: t }];
    setMsgs(historico);
    setTexto("");
    setEnviando(true);
    try {
      const { resposta } = await api.growthChat("growth-comercial", historico);
      setMsgs((l) => [...l, { role: "assistant", content: resposta }]);
    } catch (err) {
      setMsgs((l) => [...l, { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-230px)] max-w-3xl flex-col overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="border-b border-black/10 px-4 py-3">
        <div className="text-sm font-semibold">Diretor Comercial — seu coach de vendas</div>
        <div className="text-xs text-black/45">
          Peça scripts de conexão/DM, quebra de objeções, ou cole uma conversa e pergunte &quot;o que respondo?&quot;.
          Peça um treino: &quot;simule uma dona de clínica cética&quot;.
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {msgs.length === 0 && (
          <p className="grid h-full place-items-center text-center text-sm text-black/35">
            Comece a conversa. Ex.: &quot;Me dê um script de pedido de conexão no LinkedIn para donos de clínica.&quot;
          </p>
        )}
        {msgs.map((m, i) => {
          const meu = m.role === "user";
          return (
            <div key={i} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                meu ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm border border-black/10 bg-paper text-black/80"
              }`}>
                {m.content}
              </div>
            </div>
          );
        })}
        {enviando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-black/10 bg-paper px-3.5 py-2 text-sm text-black/40">
              <Loader2 size={15} className="inline animate-spin" /> pensando…
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>
      <form onSubmit={enviar} className="flex items-end gap-2 border-t border-black/10 p-3">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e as unknown as React.FormEvent); } }}
          placeholder="Escreva para o coach…"
          rows={1}
          className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"
          className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:opacity-90 disabled:opacity-40">
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}

/* ======================= Conteúdo & Aprovações ======================= */
const STATUS_BADGE: Record<string, string> = {
  rascunho: "bg-amber-100 text-amber-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  agendado: "bg-blue-100 text-blue-800",
  publicado: "bg-black/10 text-black/60",
};

function Conteudo() {
  const [posts, setPosts] = useState<GrowthPost[]>([]);
  const [tema, setTema] = useState("");
  const [qtd, setQtd] = useState(3);
  const [tom, setTom] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => { api.growthPosts().then(setPosts).catch(() => {}); }, []);
  useEffect(() => { carregar(); }, [carregar]);

  async function gerar() {
    const t = tema.trim();
    if (!t || gerando) return;
    setGerando(true);
    setErro(null);
    try {
      await api.growthGerarPosts(t, qtd, tom.trim() || undefined);
      setTema("");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <div className="sticky top-4 rounded-xl border border-black/10 bg-white p-4">
          <div className="mb-2 text-sm font-semibold">Gerar posts (Ghostwriter)</div>
          <label className="mb-1 block text-xs font-medium text-black/55">Tema / ângulo</label>
          <textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={2}
            placeholder="Ex.: por que responder em 1 minuto fecha mais vendas que qualquer anúncio"
            className="w-full resize-none rounded-lg border border-black/15 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          <div className="mt-2 flex items-center gap-3">
            <label className="text-xs font-medium text-black/55">Quantidade</label>
            <select value={qtd} onChange={(e) => setQtd(Number(e.target.value))} aria-label="Quantidade de posts"
              className="rounded-lg border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-brand">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <label className="mb-1 mt-2 block text-xs font-medium text-black/55">Tom de voz (opcional — cole exemplos seus)</label>
          <textarea value={tom} onChange={(e) => setTom(e.target.value)} rows={2}
            placeholder="Cole 1-2 posts seus para o redator clonar seu tom."
            className="w-full resize-none rounded-lg border border-black/15 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
          <button type="button" onClick={gerar} disabled={gerando || !tema.trim()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40">
            {gerando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {gerando ? "Escrevendo…" : "Gerar posts"}
          </button>
          {erro && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
        </div>
      </div>

      <div className="space-y-3 lg:col-span-7">
        <div className="text-xs font-medium text-black/50">Fila de posts ({posts.length})</div>
        {posts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
            Nenhum post ainda. Gere os primeiros à esquerda.
          </p>
        ) : posts.map((p) => <PostCard key={p.id} post={p} onChange={carregar} />)}
      </div>
    </div>
  );
}

function PostCard({ post, onChange }: { post: GrowthPost; onChange: () => void }) {
  const [conteudo, setConteudo] = useState(post.conteudo);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function patch(body: Partial<Pick<GrowthPost, "conteudo" | "status">>) {
    setSalvando(true);
    try { await api.growthAtualizarPost(post.id, body); onChange(); } finally { setSalvando(false); }
  }
  async function copiar() {
    await navigator.clipboard.writeText(conteudo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{post.titulo || "Post"}</span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[post.status] ?? ""}`}>
          {post.status}
        </span>
      </div>
      {editando ? (
        <textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} rows={10} aria-label="Conteúdo do post"
          className="w-full resize-y rounded-lg border border-black/15 p-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/80">{conteudo}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {editando ? (
          <button type="button" onClick={async () => { await patch({ conteudo }); setEditando(false); }} disabled={salvando}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">Salvar</button>
        ) : (
          <button type="button" onClick={() => setEditando(true)} className="rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]">Editar</button>
        )}
        <button type="button" onClick={copiar} className="inline-flex items-center gap-1 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.03]">
          {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
        </button>
        {post.status === "rascunho" && (
          <button type="button" onClick={() => patch({ status: "aprovado" })} disabled={salvando}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
            <Check size={13} /> Aprovar
          </button>
        )}
        {post.status === "aprovado" && (
          <button type="button" onClick={() => patch({ status: "publicado" })} disabled={salvando}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
            Marcar publicado
          </button>
        )}
        <button type="button" aria-label="Apagar post" onClick={() => { if (confirm("Apagar este post?")) api.growthApagarPost(post.id).then(onChange); }}
          className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-black/35 hover:bg-rose-50 hover:text-rose-600">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ============================ Configurações ============================ */
function Config() {
  const [cfg, setCfg] = useState<GrowthConfig | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { api.growthConfig().then(setCfg).catch(() => {}); }, []);

  async function setModo(modo: "manual" | "auto") {
    setSalvando(true);
    try { setCfg(await api.growthSetConfig({ modo_aprovacao: modo })); } finally { setSalvando(false); }
  }

  if (!cfg) return <p className="text-sm text-black/40">Carregando…</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="text-sm font-semibold">Modo de publicação</div>
        <p className="mb-3 mt-0.5 text-xs text-black/45">
          Define se os posts vão ao ar sozinhos ou se você aprova antes (recomendado).
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([["manual", "Aprovar antes", "Você revisa cada post antes de publicar."],
             ["auto", "Publicação automática", "Os posts vão ao ar assim que gerados (use com cautela)."]] as const).map(
            ([val, titulo, desc]) => (
              <button key={val} type="button" onClick={() => setModo(val)} disabled={salvando}
                className={`rounded-lg border p-3 text-left transition ${
                  cfg.modo_aprovacao === val ? "border-brand bg-brand/[0.06]" : "border-black/15 hover:bg-black/[0.02]"
                }`}>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {cfg.modo_aprovacao === val && <Check size={14} className="text-brand" />} {titulo}
                </div>
                <div className="mt-0.5 text-xs text-black/45">{desc}</div>
              </button>
            ),
          )}
        </div>
      </div>

      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="text-sm font-semibold">Conexão com o LinkedIn</div>
        <p className="mb-3 mt-0.5 text-xs text-black/45">
          Publicação direta no seu perfil chega na Fase 2 (requer criar um app no LinkedIn). Por enquanto,
          aprove os posts aqui e use o botão <strong>Copiar</strong> para postar.
        </p>
        <button type="button" disabled
          className="cursor-not-allowed rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-black/40">
          Conectar LinkedIn (em breve)
        </button>
      </div>
    </div>
  );
}
