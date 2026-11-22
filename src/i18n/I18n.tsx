import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { deviceLocale, type Locale } from './config';
import { dictionaries, type Dictionary } from './dictionaries';
import { useSettings } from '../app/store';

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/** The language is the user's choice in Settings, or the device's. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { locale: chosen } = useSettings();
  const locale = chosen ?? deviceLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => ({ locale, t: dictionaries[locale] }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside <I18nProvider>');
  return value;
}
