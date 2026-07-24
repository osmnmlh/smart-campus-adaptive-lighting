'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  formatLocalizedDateTime,
  formatLocalizedDuration,
  formatLocalizedNumber,
  formatLocalizedPercent,
} from './formatters';
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Locale } from './locale';
import { messages, type TranslationKey } from './messages';

export type TranslationValues = Readonly<Record<string, string | number>>;

export function translate(
  locale: Locale,
  key: TranslationKey,
  values: TranslationValues = {},
): string {
  const template = messages[locale][key] as string | undefined;
  if (template === undefined) {
    if (process.env.NODE_ENV !== 'production') throw new Error(`Missing translation key: ${key}`);
    return key;
  }
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

export type LocalizationContextValue = Readonly<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number) => string;
  formatDateTime: (value: string | Date) => string;
  formatDuration: (milliseconds: number) => string;
}>;

function createValue(
  locale: Locale,
  setLocale: (locale: Locale) => void,
): LocalizationContextValue {
  return {
    locale,
    setLocale,
    t: (key, values) => translate(locale, key, values),
    formatNumber: (value, options) => formatLocalizedNumber(locale, value, options),
    formatPercent: (value) => formatLocalizedPercent(locale, value),
    formatDateTime: (value) => formatLocalizedDateTime(locale, value),
    formatDuration: (value) => formatLocalizedDuration(locale, value),
  };
}

const LocalizationContext = createContext<LocalizationContextValue>(
  createValue('en', () => undefined),
);

export function LocalizationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, updateLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    let active = true;
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(stored)) {
        queueMicrotask(() => {
          if (active) updateLocale(stored);
        });
      }
    } catch {}
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((nextLocale: Locale) => {
    updateLocale(nextLocale);
    document.documentElement.lang = nextLocale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    } catch {}
  }, []);
  const value = useMemo(() => createValue(locale, setLocale), [locale, setLocale]);
  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext);
}
