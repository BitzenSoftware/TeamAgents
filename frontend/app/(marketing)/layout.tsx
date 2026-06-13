import type { Metadata } from "next";

const SITE = "https://teamagents.bitzen.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Chatbot e Agendamento Automático no WhatsApp para Clínicas de Estética | TeamAgents",
  description:
    "Automatize a recepção da sua clínica de estética no WhatsApp com IA: chatbot que atende, qualifica pacientes e faz agendamento automático 24/7, sem recepcionista. A partir de R$ 179/mês.",
  keywords: [
    "chatbot para clínica de estética",
    "chatbot WhatsApp clínica de estética",
    "agendamento automático WhatsApp",
    "automação WhatsApp clínica de estética",
    "recepcionista virtual clínica de estética",
    "IA para atendimento de clínica de estética",
    "software para clínica de estética",
    "chatbot para clínica de harmonização",
  ],
  alternates: { canonical: SITE },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Chatbot e agendamento automático no WhatsApp para clínicas de estética",
    description:
      "IA que atende cada mensagem em segundos, qualifica pacientes e agenda a avaliação sozinha — 24/7. A partir de R$ 179/mês.",
    url: SITE,
    siteName: "TeamAgents",
    type: "website",
    locale: "pt_BR",
  },
};

// Dados estruturados (Schema.org) — ajuda o Google a entender o produto.
// Sem aggregateRating: não inventamos avaliações (violaria as diretrizes do Google).
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TeamAgents",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE,
  description:
    "Chatbot de IA e agendamento automático no WhatsApp para clínicas de estética. Atende, qualifica pacientes, responde preço e agenda a avaliação 24/7.",
  offers: { "@type": "Offer", price: "179.00", priceCurrency: "BRL" },
  featureList: [
    "Chatbot de atendimento no WhatsApp 24/7",
    "Agendamento automático na agenda (Cal.com)",
    "Qualificação de pacientes",
    "Criação e publicação de anúncios no Instagram e Facebook",
    "Relatórios semanais de resultado",
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
