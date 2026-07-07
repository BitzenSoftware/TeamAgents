"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { landingCopy } from "@/lib/i18n/landing";
import { localeFromPath } from "@/lib/i18n/locale";

const KEY = "ta_cookie_consent";

// Banner de consentimento — aparece ao entrar no site (transmite segurança/profissionalismo).
// Idioma segue o path (/ → PT, /en → EN). Guarda a escolha em localStorage.
export function CookieConsent() {
  const pathname = usePathname() || "/";
  const t = landingCopy[localeFromPath(pathname)].cookies;
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setVisivel(true);
    } catch {
      /* localStorage indisponível → não bloquear a página */
    }
  }, []);

  function decidir(valor: "accepted" | "declined") {
    try {
      localStorage.setItem(KEY, valor);
    } catch {
      /* ignore */
    }
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-2xl shadow-black/10 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-relaxed text-black/65">
          {t.texto}{" "}
          <Link href="/privacidade" className="font-medium text-brand underline underline-offset-2 hover:opacity-80">{t.saibaMais}</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => decidir("declined")}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium text-black/70 transition hover:bg-black/5">{t.recusar}</button>
          <button type="button" onClick={() => decidir("accepted")}
            className="rounded-lg bg-gradient-to-r from-brand to-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">{t.aceitar}</button>
        </div>
      </div>
    </div>
  );
}
