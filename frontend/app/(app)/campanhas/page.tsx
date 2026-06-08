"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCliente } from "@/components/cliente-context";
import { api, type Campanha, type Habilidade, type SocialConfig } from "@/lib/api";

export default function CampanhasPage() {
  const { cliente } = useCliente();
  const [nicho, setNicho] = useState("");
  const [dor, setDor] = useState("");
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [lista, setLista] = useState<Campanha[]>([]);
  const [novaId, setNovaId] = useState<string | null>(null);

  const [habilidades, setHabilidades] = useState<Habilidade[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [social, setSocial] = useState<SocialConfig | null>(null);

  const carregar = useCallback(() => {
    api.campanhas().then(setLista).catch(() => {});
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    api.habilidades().then((hs) => setHabilidades(hs.filter((h) => h.ativo))).catch(() => {});
    api.getSocialConfig().then(setSocial).catch(() => {});
  }, []);

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
      setNovaId(c.id);
      setNomeCampanha("");
      setNicho("");
      setDor("");
      setLink("");
      setSelecionadas([]);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao gerar campanha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold">Fábrica de Campanhas</h1>
        <p className="text-sm text-black/50">Gera anúncios de alta conversão para o seu tráfego pago</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={gerar} className="space-y-4 rounded-xl border border-black/10 bg-white/60 p-5">
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
          <button type="submit" disabled={loading || !cliente} className="w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
            {loading ? "A gerar com a IA…" : "Gerar anúncios"}
          </button>
          {erro && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}
        </form>

        <div className="space-y-3">
          <div className="text-xs font-medium text-black/50">
            Campanhas geradas {lista.length > 0 && `(${lista.length})`}
          </div>
          {lista.length === 0 && (
            <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-black/15 p-6 text-center text-sm text-black/40">
              As campanhas geradas aparecem aqui e ficam guardadas.
            </div>
          )}
          {lista.map((c) => (
            <CampanhaCard key={c.id} c={c} aberta={c.id === novaId} onChange={carregar} social={social} />
          ))}
        </div>
      </div>

      <style>{`.campo{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:.5rem;padding:.5rem .65rem;font-size:.875rem;background:#fff}`}</style>
    </div>
  );
}

function CampanhaCard({ c, aberta, onChange, social }: { c: Campanha; aberta: boolean; onChange: () => void; social: SocialConfig | null }) {
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Cópias editáveis dos campos que o utilizador afina
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
      <div className="rounded-xl border border-black/10 bg-white p-4">
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
            <button type="button" onClick={cancelar} disabled={saving} className="rounded-lg border border-black/15 px-4 py-2 text-sm hover:bg-black/3 disabled:opacity-40">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <details open={aberta} className="rounded-xl border border-black/10 bg-white p-4">
      <summary className="flex cursor-pointer items-center gap-2">
        <span className="font-medium">{c.nome_campanha}</span>
        <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[11px]">
          {c.palavra_chave_gatilho}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
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
          <button type="button" onClick={() => setEditando(true)} className="rounded-lg border border-black/15 px-3 py-1.5 text-sm hover:bg-black/3">
            Editar
          </button>
          <button type="button" onClick={apagar} disabled={apagando} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-40">
            {apagando ? "A apagar…" : "Apagar"}
          </button>
        </div>
      </div>
    </details>
  );
}

const REDES = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "discord", label: "Discord" },
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
              title={ok ? undefined : "Liga esta rede em Configurações"}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                ativo
                  ? "border-brand bg-brand text-white"
                  : ok
                    ? "border-black/15 text-black/60 hover:bg-black/5"
                    : "cursor-not-allowed border-black/10 text-black/25"
              }`}
            >
              {r.label}
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
