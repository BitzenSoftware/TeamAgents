"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Building2, CalendarCheck, Copy, Loader2, Send, Settings2,
  Sparkles, Trash2, Check,
} from "lucide-react";
import {
  api, SUPERADMIN_EMAIL,
  type GrowthBriefing, type GrowthConfig, type GrowthMensagem, type GrowthPost,
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
function SalaDeComando() {
  const [objetivo, setObjetivo] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [res, setRes] = useState<GrowthBriefing | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function acionar() {
    const o = objetivo.trim();
    if (!o || carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      setRes(await api.growthComando(o));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
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
          className="w-full resize-none rounded-lg border border-black/15 p-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="button"
          onClick={acionar}
          disabled={carregando || !objetivo.trim()}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {carregando ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
          {carregando ? "A diretoria está trabalhando…" : "Acionar a diretoria"}
        </button>
        {erro && <p className="mt-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{erro}</p>}
      </div>

      {res && (
        <div className="space-y-4">
          <Bloco titulo="📌 Leitura estratégica (CEO)" texto={res.leitura_estrategica} />
          {res.entregaveis.map((e, i) => (
            <Bloco key={i} titulo={`👤 ${e.diretor_nome}`} subtitulo={e.foco} texto={e.conteudo} />
          ))}
          <div className="rounded-xl border-2 border-brand/30 bg-brand/[0.04] p-4">
            <div className="mb-2 text-sm font-bold text-brand">🎯 Briefing executivo</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{res.briefing}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Bloco({ titulo, subtitulo, texto }: { titulo: string; subtitulo?: string; texto: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="text-sm font-semibold">{titulo}</div>
      {subtitulo && <div className="mt-0.5 text-xs italic text-black/45">{subtitulo}</div>}
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-black/80">{texto}</p>
    </div>
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
