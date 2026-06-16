import type { MetadataRoute } from "next";

// Manifest do PWA (Next App Router serve em /manifest.webmanifest).
// Ícone placeholder em /icon.svg — substituir pelos PNGs do logo definitivo
// (192/512) quando chegarem, adicionando-os à lista de icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TeamAgents",
    short_name: "TeamAgents",
    description: "Equipe de agentes de IA para captação, qualificação e vendas no WhatsApp.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f2f8",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
