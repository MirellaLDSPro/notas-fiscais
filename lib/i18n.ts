export const LOCALES = ["pt", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pt";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "pt" || value === "en";
}

export function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("pt")) return "pt";
  if (first.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

export const LANG_COOKIE = "lang";
