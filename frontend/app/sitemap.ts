import type { MetadataRoute } from "next";

const SITE = "https://teamagents.bitzen.app";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export const revalidate = 86400; // 1 dia

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rotas: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/blog`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Artigos do blog (best-effort — se a API estiver fria, segue só com as rotas fixas).
  try {
    const r = await fetch(`${API}/blog/publicos`, { next: { revalidate: 86400 } });
    if (r.ok) {
      const posts: { slug: string; created_at?: string; updated_at?: string }[] = await r.json();
      for (const p of posts) {
        if (!p?.slug) continue;
        rotas.push({
          url: `${SITE}/blog/${p.slug}`,
          lastModified: p.updated_at || p.created_at,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
    }
  } catch {
    /* ignora — sitemap continua válido só com as rotas fixas */
  }

  return rotas;
}
