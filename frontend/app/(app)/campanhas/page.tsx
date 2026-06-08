"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCliente } from "@/components/cliente-context";
import { api, type Campanha, type Cliente, type Habilidade, type SocialConfig, type Consumo } from "@/lib/api";

export default function CampanhasPage() {
  const { cliente } = useCliente();
  const [lista, setLista] = useState<Campanha[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [social, setSocial] = useState<SocialConfig | null>(null);
  const [consumo, setConsumo] = useState<Consumo | null>(null);

  const carregarConsumo = useCallback(() => {
    api.consumo().then(setConsumo).catch(() => {});
  }, []);

  const carregar = useCallback(() => {
    api.campanhas().then(setLista).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
    api.habilidades().then((hs) => setHabilidades(hs.filter((h) => h.ativo))).catch(() => {});
    api.getSocialConfig().then(setSocial).catch(() => {});
    carregarConsumo();
  }, [carregar, carregarConsumo]);

  // Mantém uma seleção válida (auto-seleciona a primeira).
  useEffect(() => {
    if (lista.length === 0) setSelId(null);
    else if (!lista.some((c) => c.id === selId)) setSelId(lista[0].id);
  }, [lista, selId]);

  const selecionada = lista.find((c) => c.id === selId) ?? null;

  return (
    <div className="max-w-6xl p-6">
      <header className="mb-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Fábrica de Campanhas</h1>
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            + Nova campanha
          </button>
        </div>
        <p className="mt-1 text-sm text-black/50">Gera anúncios de alta conversão para o seu tráfego pago</p>
      </header>

      {consumo && <CardsConsumo c={consumo} />}

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Ainda não há campanhas. Clica em <strong>“+ Nova campanha”</strong> para gerar os teus
          primeiros anúncios.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Lista (master) */}
          <aside className="md:col-span-4 lg:col-span-3">
            <div className="mb-2 text-xs font-medium text-black/50">Campanhas geradas ({lista.length})</div>
            <div className="space-y-1.5">
              {lista.map((c) => {
                const sel = c.id === selId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelId(c.id)}
                    className={`block w-full rounded-lg border px-3 py-2.5 text-left transition ${
                      sel ? "border-brand/40 bg-brand/10" : "border-black/10 bg-white hover:bg-black/[0.03]"
                    }`}
                  >
                    <div className={`truncate text-sm ${sel ? "font-semibold text-brand" : "font-medium"}`}>
                      {c.nome_campanha}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-black/40">{c.palavra_chave_gatilho}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Detalhe (detail) */}
          <section className="md:col-span-8 lg:col-span-9">
            {selecionada ? (
              <CampanhaDetalhe key={selecionada.id} c={selecionada} onChange={carregar} social={social} />
            ) : (
              <div className="grid h-full min-h-48 place-items-center rounded-xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">
                Seleciona uma campanha à esquerda.
              </div>
            )}
          </section>
        </div>
      )}

      {modalAberto && (
        <ModalNovaCampanha
          cliente={cliente}
          habilidades={habilidades}
          onClose={() => setModalAberto(false)}
          onCreated={(c) => {
            setModalAberto(false);
            setSelId(c.id);
            carregar();
            carregarConsumo();
          }}
        />
      )}

      <style>{`.campo{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff}`}</style>
    </div>
  );
}

/* ---------------- Painel de detalhe da campanha ---------------- */
function CampanhaDetalhe({ c, onChange, social }: { c: Campanha; onChange: () => void; social: SocialConfig | null }) {
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState(c.nome_campanha);
  const [anuncioDor, setAnuncioDor] = useState(c.anuncio_dor);
  const [anuncioBeneficio, setAnuncioBeneficio] = useState(c.anuncio_beneficio);
  const [palavraChave, setPalavraChave] = useState(c.palavra_chave_gatilho);

  function cancelar() {
    setNome(c.nome_campanha);
    setAnuncioDor(c.anuncio_dor);
    setAnuncioBeneficio(c.anuncio_beneficio);
    setPalavraChave(c.palavra_chave_gatilho);
    setErro(null);
    setEditando(false);
  }

  async function guardar() {
    setSaving(true);
    setErro(null);
    try {
      await api.atualizarCampanha(c.id, {
        nome_campanha: nome,
        anuncio_dor: anuncioDor,
        anuncio_beneficio: anuncioBeneficio,
        palavra_chave_gatilho: palavraChave,
      });
      setEditando(false);
      onChange();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  }

  async function apagar() {
    if (!window.confirm(`Apagar a campanha "${c.nome_campanha}"? Esta ação não pode ser desfeita.`)) return;
    setApagando(true);
    setErro(null);
    try {
      await api.apagarCampanha(c.id);
      onChange();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao apagar");
      setApagando(false);
    }
  }

  if (editando) {
    return (
      <div className="rounded-xl border border-black/10 bg-white p-5">
        <div className="space-y-3">
          <Field label="Nome da campanha">
            <input value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="Nome da campanha" />
          </Field>
          <Field label="Anúncio — Foco na Dor">
            <textarea value={anuncioDor} onChange={(e) => setAnuncioDor(e.target.value)} className="campo h-28 resize-none" placeholder="Texto do anúncio focado na dor" />
          </Field>
          <Field label="Anúncio — Foco no Benefício">
            <textarea value={anuncioBeneficio} onChange={(e) => setAnuncioBeneficio(e.target.value)} className="campo h-28 resize-none" placeholder="Texto do anúncio focado no benefício" />
          </Field>
          <Field label="Palavra-chave de gatilho">
            <input value={palavraChave} onChange={(e) => setPalavraChave(e.target.value)} className="campo font-mono" placeholder="PALAVRA_CHAVE" />
          </Field>
          {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={guardar} disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
              {saving ? "A guardar…" : "Guardar"}
            </button>
            <button type="button" onClick={cancelar} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
        <h2 className="min-w-0 truncate text-base font-semibold text-white">{c.nome_campanha}</h2>
        <span className="shrink-0 rounded bg-white/20 px-2 py-0.5 font-mono text-[11px] text-white">
          {c.palavra_chave_gatilho}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <div className="rounded-lg border border-black/10 p-3">
          <span className="mb-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Foco na Dor</span>
          <p className="whitespace-pre-wrap text-sm">{c.anuncio_dor}</p>
          <PostarAnuncio texto={c.anuncio_dor} social={social} />
        </div>
        <div className="rounded-lg border border-black/10 p-3">
          <span className="mb-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Foco no Benefício</span>
          <p className="whitespace-pre-wrap text-sm">{c.anuncio_beneficio}</p>
          <PostarAnuncio texto={c.anuncio_beneficio} social={social} />
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 text-sm">
          <Meta k="Gatilho" v={c.gatilho_principal} />
          <Meta k="Dor-alvo" v={c.dor_alvo} />
          <Meta k="Desejo-alvo" v={c.desejo_alvo} />
          <Meta k="Palavra-chave" v={c.palavra_chave_gatilho} mono />
        </div>
        {erro && <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{erro}</p>}
        <div className="flex gap-2 border-t border-black/5 pt-3">
          <button type="button" onClick={() => setEditando(true)} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5">
            Editar
          </button>
          <button type="button" onClick={apagar} disabled={apagando} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-40">
            {apagando ? "A apagar…" : "Apagar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Modal: nova campanha ---------------- */
function ModalNovaCampanha({
  cliente,
  habilidades,
  onClose,
  onCreated,
}: {
  cliente: Cliente | null;
  habilidades: Habilidade[];
  onClose: () => void;
  onCreated: (c: Campanha) => void;
}) {
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [nicho, setNicho] = useState("");
  const [dor, setDor] = useState("");
  const [link, setLink] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function toggleHabilidade(id: string) {
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente) return;
    setLoading(true);
    setErro(null);
    try {
      const c = await api.criarCampanha({
        nome_cliente: cliente.nome,
        nicho,
        dor_latente: dor,
        nome_campanha: nomeCampanha,
        link_calendario: link || undefined,
        habilidade_ids: selecionadas,
      });
      onCreated(c);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar campanha");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark px-5 py-3">
          <span className="text-sm font-semibold text-white">Nova campanha</span>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
            ×
          </button>
        </div>
        <form onSubmit={gerar} className="space-y-4 p-5">
          <Field label="Nome da campanha">
            <input required value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} className="campo" placeholder="Ex: Contabilidade Sem Burocracia" />
          </Field>
          <Field label="Nicho de mercado">
            <input required value={nicho} onChange={(e) => setNicho(e.target.value)} className="campo" placeholder="Ex: Escritórios de contabilidade de pequeno porte" />
          </Field>
          <Field label="Dor latente / objetivo do negócio">
            <textarea required value={dor} onChange={(e) => setDor(e.target.value)} className="campo h-24 resize-none" placeholder="Ex: O dono é engolido pela burocracia e não consegue crescer." />
          </Field>
          <div className="block">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-black/60">Habilidades (opcional)</span>
              {habilidades.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelecionadas(selecionadas.length === habilidades.length ? [] : habilidades.map((h) => h.id))}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  {selecionadas.length === habilidades.length ? "Limpar" : "Selecionar todas"}
                </button>
              )}
            </div>
            {habilidades.length === 0 ? (
              <p className="rounded-lg border border-dashed border-black/15 p-3 text-xs text-black/40">
                Sem habilidades ativas. Cria conhecimento da empresa no menu{" "}
                <Link href="/habilidades" className="font-medium text-brand hover:underline">Habilidades</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {habilidades.map((h) => {
                  const sel = selecionadas.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => toggleHabilidade(h.id)}
                      title={h.conteudo}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        sel ? "border-brand bg-brand text-white" : "border-black/15 text-black/60 hover:bg-black/5"
                      }`}
                    >
                      {h.titulo}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-xs text-black/40">
              {selecionadas.length === 0
                ? "Nenhuma selecionada — gera só com nicho + dor (mais económico em tokens)."
                : `${selecionadas.length} habilidade${selecionadas.length > 1 ? "s" : ""} no prompt.`}
            </p>
          </div>
          <Field label="Link de calendário (opcional)">
            <input value={link} onChange={(e) => setLink(e.target.value)} className="campo" placeholder="https://cal.com/voce/15min" />
          </Field>
          {erro && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={loading} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !cliente} className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
              {loading ? "A gerar com a IA…" : "Gerar anúncios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const REDES = [
  {
    id: "facebook",
    label: "Facebook",
    cor: "#1877F2",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    id: "instagram",
    label: "Instagram",
    cor: "#E4405F",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
  {
    id: "discord",
    label: "Discord",
    cor: "#5865F2",
    path: "M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z",
  },
] as const;

type RedeId = (typeof REDES)[number]["id"];

function PostarAnuncio({ texto, social }: { texto: string; social: SocialConfig | null }) {
  const [sel, setSel] = useState<RedeId[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [resultados, setResultados] = useState<{ rede: RedeId; ok: boolean; msg: string }[]>([]);

  function configurado(id: RedeId): boolean {
    if (!social) return false;
    if (id === "facebook") return !!(social.facebook_page_id && social.facebook_page_access_token);
    if (id === "instagram") return !!(social.instagram_business_account_id && social.facebook_page_access_token);
    return !!social.discord_webhook_url; // discord
  }

  function toggle(id: RedeId) {
    if (!configurado(id)) return;
    setResultados([]);
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const precisaImagem = sel.includes("instagram");
  const labelRede = (id: RedeId) => REDES.find((r) => r.id === id)?.label ?? id;

  async function postar() {
    setPosting(true);
    setResultados([]);
    const res: { rede: RedeId; ok: boolean; msg: string }[] = [];
    for (const rede of sel) {
      try {
        if (rede === "facebook") await api.postarFacebook(texto);
        else if (rede === "instagram") await api.postarInstagram(texto, imageUrl.trim() || undefined);
        else await api.postarDiscord(texto);
        res.push({ rede, ok: true, msg: "publicado" });
      } catch (err) {
        res.push({ rede, ok: false, msg: err instanceof Error ? err.message : "erro" });
      }
    }
    setResultados(res);
    setPosting(false);
  }

  return (
    <div className="mt-3 border-t border-black/5 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        {REDES.map((r) => {
          const ok = configurado(r.id);
          const ativo = sel.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              disabled={!ok}
              aria-label={r.label}
              title={ok ? r.label : `Liga o ${r.label} em Configurações`}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                ativo
                  ? "border-brand bg-brand"
                  : ok
                    ? "border-black/15 hover:bg-black/5"
                    : "cursor-not-allowed border-black/10 opacity-40"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill={ativo ? "#ffffff" : r.cor}>
                <path d={r.path} />
              </svg>
            </button>
          );
        })}
        <button
          type="button"
          onClick={postar}
          disabled={posting || sel.length === 0 || (precisaImagem && !imageUrl.trim())}
          className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {posting ? "A publicar…" : "Postar"}
        </button>
      </div>
      {precisaImagem && (
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="URL da imagem (obrigatório para Instagram)"
          className="campo mt-2 text-xs"
        />
      )}
      {resultados.length > 0 && (
        <div className="mt-2 space-y-1">
          {resultados.map((r) => (
            <p key={r.rede} className={`text-[11px] ${r.ok ? "text-emerald-700" : "text-rose-700"}`}>
              {r.ok ? "✓" : "✗"} {labelRede(r.rede)}: {r.ok ? "publicado" : r.msg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function CardsConsumo({ c }: { c: Consumo }) {
  // Cor consoante o uso: verde < 70%, âmbar 70-89%, vermelho >= 90%.
  const cor =
    c.percent >= 90 ? "bg-rose-500" : c.percent >= 70 ? "bg-amber-500" : "bg-brand";

  const faixa = "bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-xs font-semibold text-white";

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className={faixa}>Créditos usados (mês)</div>
        <div className="p-4 text-2xl font-semibold">
          {c.usados}
          <span className="text-base font-normal text-black/40"> / {c.total}</span>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className={faixa}>Disponíveis</div>
        <div className="p-4 text-2xl font-semibold">{c.restantes}</div>
      </div>
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        <div className={`${faixa} flex items-center justify-between`}>
          <span>Uso do plano</span>
          <span>{c.percent}%</span>
        </div>
        <div className="p-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
            <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${c.percent}%` }} />
          </div>
          {c.percent >= 90 && (
            <p className="mt-2 text-[11px] text-rose-600">
              Limite quase atingido — faz upgrade para não parar as gerações.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-black/60">{label}</span>
      {children}
    </label>
  );
}

function Meta({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-black/40">{k}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{v}</div>
    </div>
  );
}
