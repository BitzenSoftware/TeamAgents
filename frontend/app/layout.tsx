import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/components/auth-context";
import { ClienteProvider } from "@/components/cliente-context";
import { LocaleProvider } from "@/components/i18n-context";
import { RegisterSW } from "@/components/RegisterSW";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n/locale";

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
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider initial={locale}>
          <AuthProvider>
            <ClienteProvider>
              {children}
            </ClienteProvider>
          </AuthProvider>
        </LocaleProvider>
        <RegisterSW />
      </body>
    </html>
  );
}
