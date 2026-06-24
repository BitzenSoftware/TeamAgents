import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TeamAgents — a equipe de IA da sua empresa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagem de preview (Open Graph / redes / buscas) — gerada pelo Next.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg,#0a0a1f 0%,#171248 60%,#0a0a1f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg,#5b51e6,#4338ca)",
              fontSize: 50,
              fontWeight: 800,
            }}
          >
            TA
          </div>
          <div style={{ fontSize: 46, fontWeight: 700 }}>TeamAgents</div>
        </div>

        <div style={{ marginTop: 56, fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
          A equipe de IA da sua empresa.
        </div>

        <div style={{ marginTop: 28, fontSize: 34, color: "#a5b4fc", maxWidth: 920 }}>
          Atende clientes no WhatsApp e cuida da gestão — financeiro, jurídico, projetos. 24/7.
        </div>

        <div style={{ marginTop: "auto", fontSize: 26, color: "rgba(255,255,255,0.5)" }}>
          teamagents.bitzen.app
        </div>
      </div>
    ),
    { ...size },
  );
}
