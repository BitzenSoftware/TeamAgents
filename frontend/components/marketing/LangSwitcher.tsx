"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, localizedHref, type Locale } from "@/lib/i18n/locale";

// Troca de idioma manual (tem prioridade sobre o geo-IP, via cookie de 1 ano).
export function LangSwitcher({ locale, labels }: { locale: Locale; labels: { pt: string; en: string; label: string } }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  function go(target: Locale) {
    if (target === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
    // Caminho "nu" (sem prefixo) → aplica o prefixo do idioma alvo.
    const bare = pathname === "/en" ? "/" : pathname.startsWith("/en/") ? pathname.slice(3) : pathname;
    router.push(localizedHref(bare, target));
  }

  const base = "px-2 py-1 text-xs font-semibold rounded-md transition";
  return (
    <div className="flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 text-white/60" aria-label={labels.label}>
      <button type="button" onClick={() => go("pt")} aria-pressed={locale === "pt"} className={`${base} ${locale === "pt" ? "bg-white text-[#0a0a1f]" : "hover:text-white"}`}>{labels.pt}</button>
      <button type="button" onClick={() => go("en")} aria-pressed={locale === "en"} className={`${base} ${locale === "en" ? "bg-white text-[#0a0a1f]" : "hover:text-white"}`}>{labels.en}</button>
    </div>
  );
}
