import type { Metadata } from "next";
import "./globals.css";
import { ClienteProvider } from "@/components/cliente-context";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "TeamAgents — Painel",
  description: "Pipeline, campanhas e consultoria de BI da sua equipe de IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <ClienteProvider>
          <Shell>{children}</Shell>
        </ClienteProvider>
      </body>
    </html>
  );
}
