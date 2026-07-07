import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, localeFromCountry } from "@/lib/i18n/locale";

// Só decide o idioma da LANDING (/ e /en). Não toca em app, api, blog, etc.
export const config = { matcher: ["/", "/en"] };

// Não redirecionar crawlers: assim o Google/Bing indexam / e /en tal como são
// (a relação entre versões é dada pelas tags hreflang no metadata).
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|discord|preview|lighthouse|headless/i;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(LOCALE_COOKIE)?.value;
  const ua = req.headers.get("user-agent") || "";
  const isBot = BOT_RE.test(ua);

  // Escolha manual (cookie) manda sempre.
  if (cookie === "en" && pathname === "/") return NextResponse.redirect(new URL("/en", req.url));
  if (cookie === "pt" && pathname === "/en") return NextResponse.redirect(new URL("/", req.url));
  if (cookie || isBot) return NextResponse.next();

  // Sem cookie e humano: decide pelo país (geo da Vercel).
  const country = req.headers.get("x-vercel-ip-country") || (req as unknown as { geo?: { country?: string } }).geo?.country;
  const locale = localeFromCountry(country);
  if (locale === "en" && pathname === "/") return NextResponse.redirect(new URL("/en", req.url));

  return NextResponse.next();
}
