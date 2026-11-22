// Languages the app is translated into. Italian is the source language: the
// other dictionaries are typed against it, so a missing key fails the build.

export const LOCALES = ['it', 'en', 'es', 'nl', 'fr', 'ja'] as const;
export type Locale = (typeof LOCALES)[number];

/** Used when the device language is none of the above. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Each language in its own words, for the picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  nl: 'Nederlands',
  fr: 'Français',
  ja: '日本語',
};

// Tags handed to Intl for dates. en-GB because the app is day-first, 24-hour
// and starts the week on Monday.
export const INTL_TAGS: Record<Locale, string> = {
  it: 'it-IT',
  en: 'en-GB',
  es: 'es-ES',
  nl: 'nl-NL',
  fr: 'fr-FR',
  ja: 'ja-JP',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** The first supported language among the device's preferred ones. */
export function deviceLocale(languages: readonly string[] = typeof navigator !== 'undefined' ? navigator.languages : []): Locale {
  for (const tag of languages) {
    const lang = tag.toLowerCase().split('-')[0];
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}
