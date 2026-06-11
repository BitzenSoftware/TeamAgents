import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TeamAgents — A recepção de IA que atende sua clínica no WhatsApp 24/7",
  description:
    "Sua clínica de estética nunca mais perde uma cliente no WhatsApp. A IA atende cada mensagem em segundos, qualifica, responde o “quanto custa?” e agenda a avaliação — 24 horas por dia. A partir de R$ 179/mês.",
  keywords: [
    "atendimento WhatsApp clínica de estética",
    "agendamento automático estética",
    "recepção com IA",
    "responder DM Instagram clínica",
    "SDR para estética",
    "automação WhatsApp harmonização facial",
  ],
  openGraph: {
    title: "A cliente te chamou às 22h. Quem respondeu foi a sua IA.",
    description:
      "Recepção de IA para clínicas de estética: atende, qualifica e agenda a avaliação no WhatsApp 24/7. A partir de R$ 179/mês.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
