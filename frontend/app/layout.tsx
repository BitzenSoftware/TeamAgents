import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-context";
import { ClienteProvider } from "@/components/cliente-context";

export const metadata: Metadata = {
  title: "TeamAgents",
  description: "Tríade de agentes de IA para captação, qualificação e análise de leads.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <AuthProvider>
          <ClienteProvider>
            {children}
          </ClienteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
