import { NextResponse, type NextRequest } from "next/server";
import { CURRENCY_COOKIE, LOCALE_COOKIE, currencyFromCountry, localeFromCountry } from "@/lib/i18n/locale";

// Corre em todas as páginas (exceto api, assets e estáticos) para:
//  1) decidir o idioma da LANDING (/ e /en);
//  2) definir o cookie de MOEDA por país (BR→BRL, resto→USD) em qualquer página.
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };

// Não redirecionar crawlers: assim o Google/Bing indexam / e /en tal como são
// (a relação entre versões é dada pelas tags hreflang no metadata).
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|discord|preview|lighthouse|headless/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const country = req.headers.get("x-vercel-ip-country") || (req as unknown as { geo?: { country?: string } }).geo?.country;

  // --- 1) Idioma da landing (só / e /en) ---
  let res: NextResponse | null = null;
  if (pathname === "/" || pathname === "/en") {
    const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
    const ua = req.headers.get("user-agent") || "";
    const isBot = BOT_RE.test(ua);

    // Escolha manual (cookie) manda sempre.
    if (cookie === "en" && pathname === "/") res = NextResponse.redirect(new URL("/en", req.url));
    else if (cookie === "pt" && pathname === "/en") res = NextResponse.redirect(new URL("/", req.url));
    else if (!cookie && !isBot) {
      // Sem cookie e humano: decide pelo país (geo da Vercel).
      const locale = localeFromCountry(country);
      if (locale === "en" && pathname === "/") res = NextResponse.redirect(new URL("/en", req.url));
    }
  }

  if (!res) res = NextResponse.next();

  // --- 2) Moeda por país: define o cookie se ainda não existir ---
  if (!req.cookies.get(CURRENCY_COOKIE)) {
    res.cookies.set(CURRENCY_COOKIE, currencyFromCountry(country), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return res;
}
