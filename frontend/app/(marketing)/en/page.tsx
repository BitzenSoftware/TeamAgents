import type { Metadata } from "next";
import { Landing } from "@/components/marketing/Landing";

const SITE = "https://teamagents.bitzen.app";

export const metadata: Metadata = {
  title: "TeamAgents — Your company's AI team (WhatsApp, finance, legal and more)",
  description:
    "A team of AI agents for your business: it serves and captures customers on WhatsApp, and gives you specialists in finance, legal, projects and strategy that know your business. 24/7, from $49/mo.",
  keywords: [
    "AI agents for business",
    "AI team",
    "AI assistant for business",
    "WhatsApp customer support chatbot",
    "AI for small business",
    "AI customer service automation",
    "AI finance agent",
    "AI legal agent",
    "business management with AI",
  ],
  alternates: {
    canonical: `${SITE}/en`,
    languages: { "pt-BR": SITE, "en-US": `${SITE}/en`, "x-default": SITE },
  },
  openGraph: {
    title: "TeamAgents — your company's AI team",
    description:
      "Serves customers on WhatsApp and runs management (finance, legal, projects, strategy) with AI agents that know your business. 24/7, from $49/mo.",
    url: `${SITE}/en`,
    siteName: "TeamAgents",
    type: "website",
    locale: "en_US",
  },
};

export default function LandingEN() {
  return <Landing locale="en" />;
}
