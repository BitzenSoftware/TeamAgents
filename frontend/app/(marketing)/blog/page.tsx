import Link from "next/link";
import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SITE = "https://teamagents.bitzen.app";

export const metadata: Metadata = {
  title: "Blog | IA para empresas: atendimento no WhatsApp e gestão — TeamAgents",
  description:
    "Conteúdos sobre agentes de IA para empresas: automação de atendimento e captação no WhatsApp, e gestão (finanças, jurídico, projetos, estratégia) com inteligência artificial.",
  alternates: { canonical: `${SITE}/blog` },
  openGraph: {
    title: "Blog TeamAgents — IA para atendimento e gestão de empresas",
    description:
      "Agentes de IA para atender no WhatsApp e cuidar da gestão da sua empresa. Artigos práticos sobre IA aplicada a negócios.",
    url: `${SITE}/blog`,
    type: "website",
    locale: "pt_BR",
  },
};

type Resumo = { slug: string; titulo: string; resumo: string | null; capa_url: string | null; created_at: string };

async function getPosts(): Promise<Resumo[]> {
  try {
    const r = await fetch(`${API}/blog/publicos`, { next: { revalidate: 300 } });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-medium text-brand hover:underline">← Voltar ao site</Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Blog</h1>
      <p className="mt-1.5 text-black/55">
        IA aplicada a negócios: atendimento e captação no WhatsApp, e gestão (finanças, jurídico, projetos, estratégia).
      </p>

      {posts.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/40">
          Em breve, novos artigos por aqui.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="block rounded-2xl border border-black/10 bg-white p-5 transition hover:border-brand/30 hover:shadow-sm"
            >
              <div className="text-xs text-black/40">
                {new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{p.titulo}</h2>
              {p.resumo && <p className="mt-1 text-sm leading-relaxed text-black/55">{p.resumo}</p>}
              <span className="mt-2 inline-block text-sm font-medium text-brand">Ler artigo →</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
