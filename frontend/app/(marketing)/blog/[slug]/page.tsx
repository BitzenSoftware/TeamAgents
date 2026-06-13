import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { marked } from "marked";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SITE = "https://teamagents.bitzen.app";

type Post = {
  slug: string;
  titulo: string;
  resumo: string | null;
  meta_description: string | null;
  conteudo: string;
  capa_url: string | null;
  created_at: string;
  updated_at: string;
};

async function getPost(slug: string): Promise<Post | null> {
  try {
    const r = await fetch(`${API}/blog/publicos/${slug}`, { next: { revalidate: 300 } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Artigo não encontrado | TeamAgents" };
  const desc = post.meta_description || post.resumo || undefined;
  return {
    title: `${post.titulo} | TeamAgents`,
    description: desc,
    alternates: { canonical: `${SITE}/blog/${post.slug}` },
    openGraph: {
      title: post.titulo,
      description: desc,
      type: "article",
      url: `${SITE}/blog/${post.slug}`,
      images: post.capa_url ? [post.capa_url] : undefined,
    },
  };
}

export default async function ArtigoPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();
  const html = await marked.parse(post.conteudo);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.titulo,
    description: post.meta_description || post.resumo || undefined,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    image: post.capa_url || undefined,
    author: { "@type": "Organization", name: "TeamAgents" },
    publisher: { "@type": "Organization", name: "TeamAgents" },
    mainEntityOfPage: `${SITE}/blog/${post.slug}`,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blog" className="text-sm font-medium text-brand hover:underline">← Blog</Link>
      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{post.titulo}</h1>
      <div className="mt-2 text-sm text-black/40">
        {new Date(post.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
      </div>
      {post.capa_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.capa_url} alt={post.titulo} className="mt-6 w-full rounded-2xl border border-black/10" />
      )}
      <article className="artigo mt-6" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="mt-10 rounded-2xl border border-brand/20 bg-brand/[0.04] p-6 text-center">
        <p className="text-lg font-semibold">Quer ver isso funcionando na sua clínica?</p>
        <p className="mt-1 text-sm text-black/55">
          A recepção de IA do TeamAgents atende, qualifica e agenda no WhatsApp 24/7.
        </p>
        <Link href="/login" className="mt-3 inline-block rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
          Começar agora →
        </Link>
      </div>

      <style>{`
        .artigo{color:rgba(0,0,0,.8);line-height:1.75;font-size:1.05rem}
        .artigo h2{font-size:1.5rem;font-weight:700;margin:1.9rem 0 .6rem;letter-spacing:-.01em;color:#111}
        .artigo h3{font-size:1.2rem;font-weight:700;margin:1.4rem 0 .5rem;color:#111}
        .artigo p{margin:.9rem 0}
        .artigo ul,.artigo ol{margin:.9rem 0;padding-left:1.4rem}
        .artigo ul{list-style:disc}.artigo ol{list-style:decimal}
        .artigo li{margin:.35rem 0}
        .artigo a{color:#4f46e5;text-decoration:underline}
        .artigo strong{font-weight:700;color:#111}
        .artigo blockquote{border-left:3px solid rgba(0,0,0,.12);padding-left:1rem;color:rgba(0,0,0,.55);margin:1rem 0}
        .artigo img{border-radius:.75rem;margin:1rem 0;max-width:100%}
        .artigo code{background:rgba(0,0,0,.06);padding:.1rem .35rem;border-radius:.3rem;font-size:.9em}
      `}</style>
    </main>
  );
}
