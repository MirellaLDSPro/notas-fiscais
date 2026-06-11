import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";
import {
  detectLocaleFromAcceptLanguage,
  isLocale,
  LANG_COOKIE,
  type Locale,
} from "@/lib/i18n";

const { auth } = NextAuth(authConfig);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function withLangCookie(res: NextResponse, locale: Locale): NextResponse {
  res.cookies.set(LANG_COOKIE, locale, {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
  return res;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLandingPt = pathname === "/";
  const isLandingEn = pathname === "/en";

  if (isLandingPt || isLandingEn) {
    const stored = req.cookies.get(LANG_COOKIE)?.value;
    const cookieLocale = isLocale(stored) ? stored : undefined;

    if (isLandingPt && !cookieLocale) {
      const detected = detectLocaleFromAcceptLanguage(
        req.headers.get("accept-language"),
      );
      if (detected === "en") {
        const url = req.nextUrl.clone();
        url.pathname = "/en";
        return withLangCookie(NextResponse.redirect(url), "en");
      }
    }

    const targetLocale: Locale = isLandingEn ? "en" : "pt";
    if (cookieLocale !== targetLocale) {
      return withLangCookie(NextResponse.next(), targetLocale);
    }
    return;
  }

  if (!req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", req.nextUrl.pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
