'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function LanguageSelector() {
  const { locale, setLocale, t } = useLocalization();
  return (
    <div className="language-selector" role="group" aria-label={t('language.selector')}>
      <button
        type="button"
        aria-pressed={locale === 'tr'}
        aria-label={t('language.turkish')}
        onClick={() => setLocale('tr')}
      >
        TR
      </button>
      <button
        type="button"
        aria-pressed={locale === 'en'}
        aria-label={t('language.english')}
        onClick={() => setLocale('en')}
      >
        EN
      </button>
    </div>
  );
}
