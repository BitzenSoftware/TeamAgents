import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-context";
import { ClienteProvider } from "@/components/cliente-context";
import { Guard } from "@/components/Guard";

export const metadata: Metadata = {
  title: "TeamAgents — Painel",
  description: "Pipeline, campanhas e consultoria de BI da sua equipe de IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <AuthProvider>
          <ClienteProvider>
            <Guard>{children}</Guard>
          </ClienteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
