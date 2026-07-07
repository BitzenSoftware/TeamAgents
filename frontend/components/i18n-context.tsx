"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { appCopy, type AppDict } from "@/lib/i18n/app";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/locale";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: AppDict };

const I18nContext = createContext<Ctx | null>(null);

// O locale inicial vem do servidor (cookie), evitando flash/hydration mismatch.
export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(isLocale(initial) ? initial : DEFAULT_LOCALE);

  const setLocale = useCallback((l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setLocaleState(l);
  }, []);

  const value = useMemo<Ctx>(() => ({ locale, setLocale, t: appCopy[locale] }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale deve ser usado dentro de <LocaleProvider>");
  return ctx;
}

// Atalho: só o dicionário da app.
export function useT(): AppDict {
  return useLocale().t;
}
