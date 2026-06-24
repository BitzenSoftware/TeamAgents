import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-context";
import { ClienteProvider } from "@/components/cliente-context";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  metadataBase: new URL("https://teamagents.bitzen.app"),
  title: "TeamAgents",
  description: "A equipe de IA da sua empresa — atende no WhatsApp e cuida da gestão.",
  applicationName: "TeamAgents",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "TeamAgents" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <RegisterSW />
      </body>
    </html>
  );
}
