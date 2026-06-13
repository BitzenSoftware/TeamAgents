"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, SUPERADMIN_EMAIL, type BlogPost } from "@/lib/api";
import { useAuth } from "@/components/auth-context";

const VAZIO = { titulo: "", slug: "", resumo: "", meta_description: "", capa_url: "", conteudo: "", publicado: false };

export default function AdminBlogPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const isAdmin = session?.user.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selId, setSelId] = useState<string | null>(null); // null = nada; "novo" = criar
  const [form, setForm] = useState({ ...VAZIO });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/pipeline");
  }, [authLoading, isAdmin, router]);

  const carregar = useCallback(() => {
    if (!isAdmin) return;
    api.adminBlogListar().then(setPosts).catch(() => {});
  }, [isAdmin]);
  useEffect(() => { carregar(); }, [carregar]);

  function novo() {
    setSelId("novo"); setForm({ ...VAZIO }); setErro(null); setMsg(null);
  }
  function abrir(p: BlogPost) {
    setSelId(p.id);
    setForm({
      titulo: p.titulo ?? "", slug: p.slug ?? "", resumo: p.resumo ?? "",
      meta_description: p.meta_description ?? "", capa_url: p.capa_url ?? "",
      conteudo: p.conteudo ?? "", publicado: p.publicado,
    });
    setErro(null); setMsg(null);
  }
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setMsg(null);
  }

  async function salvar() {
    if (!form.titulo.trim()) { setErro("Dê um título ao artigo."); return; }
    setSaving(true); setErro(null); setMsg(null);
    try {
      if (selId === "novo") {
        const np = await api.adminBlogCriar(form);
        setSelId(np.id);
        setForm((f) => ({ ...f, slug: np.slug }));
        setMsg("Artigo criado.");
      } else if (selId) {
        const up = await api.adminBlogAtualizar(selId, form);
        setForm((f) => ({ ...f, slug: up.slug }));
        setMsg("Artigo salvo.");
      }
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  }

  async function apagar() {
    if (!selId || selId === "novo") return;
    if (!confirm("Apagar este artigo?")) return;
    await api.adminBlogApagar(selId);
    setSelId(null); setForm({ ...VAZIO }); carregar();
  }

  if (!authLoading && !isAdmin) return null;

  const editando = selId !== null;
  const salvo = posts.find((p) => p.id === selId);

  return (
    <div className="p-6">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Blog</h1>
          <p className="mt-1 text-sm text-black/50">Crie e publique os artigos que aparecem na página de vendas (/blog).</p>
        </div>
        <button type="button" onClick={novo} className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
          + Novo artigo
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* Lista */}
        <aside className="md:col-span-4 lg:col-span-3">
          <div className="mb-2 text-xs font-medium text-black/50">Artigos ({posts.length})</div>
          {posts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-center text-xs text-black/40">Nenhum artigo ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {posts.map((p) => {
                const ativo = p.id === selId;
                return (
                  <button key={p.id} type="button" onClick={() => abrir(p)}
                    className={`block w-full rounded-lg border px-3 py-2.5 text-left transition ${ativo ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`min-w-0 flex-1 truncate text-sm ${ativo ? "font-semibold text-brand" : "font-medium"}`}>{p.titulo}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${p.publicado ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {p.publicado ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-black/40">/blog/{p.slug}</div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Editor */}
        <section className="md:col-span-8 lg:col-span-9">
          {!editando ? (
            <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
              Selecione um artigo à esquerda ou clique em <strong className="mx-1">+ Novo artigo</strong>.
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-black/10 bg-white p-5">
              <Campo label="Título">
                <input className="ip" value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ex: Como automatizar o agendamento da sua clínica pelo WhatsApp" />
              </Campo>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo label="Slug (URL) — deixe em branco para gerar do título">
                  <input className="ip font-mono" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="como-automatizar-agendamento" />
                </Campo>
                <Campo label="URL da imagem de capa (opcional)">
                  <input className="ip" value={form.capa_url} onChange={(e) => set("capa_url", e.target.value)} placeholder="https://..." />
                </Campo>
              </div>
              <Campo label="Resumo (aparece na lista do blog)">
                <textarea className="ip h-16 resize-none" value={form.resumo} onChange={(e) => set("resumo", e.target.value)} placeholder="1–2 frases que resumem o artigo." />
              </Campo>
              <Campo label="Meta description (SEO — até ~155 caracteres)">
                <textarea className="ip h-16 resize-none" value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} placeholder="Descrição para o Google. Se vazio, usamos o resumo." />
              </Campo>
              <Campo label="Conteúdo (Markdown) — use ## para títulos, - para listas, **negrito**">
                <textarea className="ip h-96 resize-y font-mono text-[13px]" value={form.conteudo} onChange={(e) => set("conteudo", e.target.value)} placeholder={"## Introdução\n\nEscreva aqui...\n\n## Conclusão\n\n- ponto 1\n- ponto 2"} />
              </Campo>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.publicado} onChange={(e) => set("publicado", e.target.checked)} />
                Publicado (visível no site)
              </label>

              {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
              {msg && <p className="text-sm text-emerald-700">✓ {msg}</p>}

              <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
                <button type="button" onClick={salvar} disabled={saving} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
                  {saving ? "Salvando…" : "Salvar"}
                </button>
                {salvo?.publicado && (
                  <a href={`/blog/${salvo.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-black/15 px-3 py-2 text-sm hover:bg-black/5">
                    Ver no site ↗
                  </a>
                )}
                {selId !== "novo" && (
                  <button type="button" onClick={apagar} className="ml-auto rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">
                    Apagar
                  </button>
                )}
              </div>
              <style>{`.ip{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff;outline:none}.ip:focus{border-color:rgb(79,70,229)}`}</style>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/55">{label}</span>
      {children}
    </label>
  );
}
