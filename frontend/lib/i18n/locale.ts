// Fundação i18n — TeamAgents. Dois idiomas: PT (default, BR em "/") e EN (US em "/en").
// Estratégia de URL: prefixo só no idioma não-default (/en). PT fica na raiz.

export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";

// Cookie onde guardamos a escolha manual do utilizador (tem prioridade sobre o geo-IP).
export const LOCALE_COOKIE = "ta_locale";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "pt" || v === "en";
}

// Países que servimos em inglês por defeito (US e mercados anglófonos principais).
// Resto do mundo → PT (default). Ajustável.
const EN_COUNTRIES = new Set(["US", "CA", "GB", "AU", "NZ", "IE"]);

export function localeFromCountry(country: string | undefined | null): Locale {
  if (country && EN_COUNTRIES.has(country.toUpperCase())) return "en";
  return DEFAULT_LOCALE;
}

// Deriva o locale a partir do pathname (ex.: "/en", "/en/blog" → "en"; resto → "pt").
export function localeFromPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt";
}

// Constrói um href com o prefixo correto do locale (pt sem prefixo, en com /en).
export function localizedHref(href: string, locale: Locale): string {
  if (locale === "pt") return href;
  if (!href.startsWith("/")) return href; // âncoras (#...) e externos ficam iguais
  if (href === "/") return "/en";
  return `/en${href}`;
}
