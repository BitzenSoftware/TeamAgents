// /llms.txt — resumo do site para LLMs (padrão emergente, llmstxt.org).
// Dinâmico: lista os artigos publicados do blog, igual ao sitemap. Best-effort:
// se a API estiver fria, cai num fallback que ainda aponta para o índice /blog.

const SITE = "https://teamagents.bitzen.app";
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export const revalidate = 86400; // 1 dia

type PostResumo = { slug: string; titulo: string; resumo?: string | null };

async function getPosts(): Promise<PostResumo[]> {
  try {
    const r = await fetch(`${API}/blog/publicos`, { next: { revalidate: 86400 } });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const posts = await getPosts();

  const linhasBlog = posts.length
    ? posts
        .filter((p) => p?.slug && p?.titulo)
        .map((p) => `- [${p.titulo}](${SITE}/blog/${p.slug})${p.resumo ? `: ${p.resumo}` : ""}`)
        .join("\n")
    : `- [Blog](${SITE}/blog): artigos sobre IA aplicada a atendimento, captação e gestão de empresas.`;

  const md = `# TeamAgents

> TeamAgents é uma plataforma brasileira de agentes de IA para empresas. Uma parte dos agentes atende e capta clientes no WhatsApp 24/7 (atendimento, qualificação e agendamento); outra parte funciona como uma equipe de especialistas em gestão (financeiro, jurídico, RH, projetos, estratégia e mais), que conhecem o contexto do negócio e geram relatórios e planos de ação. Em português (pt-BR), a partir de R$ 179/mês, sem fidelidade.

## O que é

- É horizontal: serve para serviços, comércio, agências, contabilidade, advocacia, clínicas e consultorias.
- Os agentes se adaptam ao negócio: em "Habilidades" a empresa cadastra produtos, preços, políticas, objeções e tom de voz; em cada projeto anexa documentos (PDF, Excel, Word) que viram contexto compartilhado.
- Conexão do WhatsApp em 1 clique (leitura de QR Code, sem número novo e sem instalar nada).
- Gestão por projetos: estrutura Empresa › Departamentos › Projetos, cada projeto com seu time de agentes e contexto próprio; os melhores resultados são salvos como relatórios/planos de ação em PDF.
- Cobrança por créditos: cada operação consome créditos conforme o custo real de IA. Cancelamento a qualquer momento, dentro da própria aplicação.

## Páginas principais

- [Site / produto](${SITE}/): visão geral, agentes, gestão por projetos, preços e perguntas frequentes.
- [Blog](${SITE}/blog): artigos sobre IA aplicada a atendimento, captação e gestão de empresas.
- [Entrar / criar conta](${SITE}/login): acesso à aplicação.
- [Privacidade](${SITE}/privacidade): política de privacidade e tratamento de dados.

## Artigos do blog

${linhasBlog}

## Contato

- Empresa: TeamAgents (Bitzen)
- Site: ${SITE}
`;

  return new Response(md, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
