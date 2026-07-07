import type { Metadata } from "next";
import { Landing } from "@/components/marketing/Landing";

const SITE = "https://teamagents.bitzen.app";

export const metadata: Metadata = {
  alternates: {
    canonical: SITE,
    languages: { "pt-BR": SITE, "en-US": `${SITE}/en`, "x-default": SITE },
  },
};

export default function LandingPT() {
  return <Landing locale="pt" />;
}
