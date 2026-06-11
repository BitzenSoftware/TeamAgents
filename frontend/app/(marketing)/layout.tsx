import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TeamAgents — A sua equipe de agentes de IA",
  description:
    "Quatro agentes de IA especializados: criam anúncios de alta conversão, qualificam leads no WhatsApp, resumem o seu email e entregam relatórios estratégicos — 24/7. A partir de R$ 179/mês.",
  keywords: [
    "agentes de IA",
    "SDR automático",
    "qualificação de leads WhatsApp",
    "copywriting com IA",
    "resumo de emails IA",
    "relatórios de marketing",
  ],
  openGraph: {
    title: "TeamAgents — Contrate uma equipe de IA, não mais um software",
    description:
      "4 agentes especializados trabalhando 24/7: anúncios, WhatsApp, email e relatórios. A partir de R$ 179/mês.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
