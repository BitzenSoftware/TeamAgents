import type { Metadata } from "next";

const SITE = "https://teamagents.bitzen.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "TeamAgents — A equipe de IA da sua empresa (WhatsApp, finanças, jurídico e mais)",
  description:
    "Uma equipe de agentes de IA para a sua empresa: atende e capta clientes no WhatsApp, e dá especialistas em finanças, jurídico, projetos e estratégia que conhecem o seu negócio. 24/7, a partir de R$ 179/mês.",
  keywords: [
    "agentes de IA para empresas",
    "equipe de IA",
    "assistente de IA para empresas",
    "chatbot de atendimento no WhatsApp",
    "IA para pequenas e médias empresas",
    "automação de atendimento com IA",
    "agente financeiro de IA",
    "agente jurídico de IA",
    "gestão com inteligência artificial",
  ],
  alternates: { canonical: SITE },
  robots: { index: true, follow: true },
  openGraph: {
    title: "TeamAgents — a equipe de IA da sua empresa",
    description:
      "Atende clientes no WhatsApp e cuida da gestão (financeiro, jurídico, projetos, estratégia) com agentes de IA que conhecem o seu negócio. 24/7, a partir de R$ 179/mês.",
    url: SITE,
    siteName: "TeamAgents",
    type: "website",
    locale: "pt_BR",
  },
};

// Dados estruturados (Schema.org). Sem aggregateRating: não inventamos avaliações.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TeamAgents",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE,
  description:
    "Plataforma de agentes de IA para empresas: atendimento e captação no WhatsApp + especialistas em finanças, jurídico, RH, projetos e estratégia, com gestão por projetos e análise de documentos.",
  offers: { "@type": "Offer", price: "179.00", priceCurrency: "BRL" },
  featureList: [
    "Atendimento e captação no WhatsApp 24/7",
    "Criação e publicação de anúncios no Instagram e Facebook",
    "Relatórios semanais de resultado",
    "10 agentes especialistas (financeiro, jurídico, RH, projetos, estratégia e mais)",
    "Gestão por departamentos e projetos com análise de documentos",
    "Relatórios e planos de ação em PDF",
  ],
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {children}
    </>
  );
}
