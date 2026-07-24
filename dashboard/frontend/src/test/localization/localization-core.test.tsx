import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LocalizationProvider,
  translate,
  useLocalization,
} from '@/features/localization/localization-provider';
import {
  formatLocalizedDateTime,
  formatLocalizedDuration,
  formatLocalizedNumber,
  formatLocalizedPercent,
} from '@/features/localization/formatters';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { LOCALE_STORAGE_KEY } from '@/features/localization/locale';
import { enMessages, trMessages, type TranslationKey } from '@/features/localization/messages';

function Probe() {
  const { locale, setLocale, t } = useLocalization();
  return (
    <>
      <output>{locale}</output>
      <span>{t('nav.overview')}</span>
      <button onClick={() => setLocale('en')}>switch</button>
    </>
  );
}

const renderProbe = () =>
  render(
    <LocalizationProvider>
      <Probe />
    </LocalizationProvider>,
  );

describe('localization core', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'tr';
  });

  it('defaults to Turkish', () => {
    renderProbe();
    expect(screen.getByText('tr')).toBeVisible();
    expect(screen.getByText('Genel Bakış')).toBeVisible();
  });

  it('restores stored Turkish', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'tr');
    renderProbe();
    expect(screen.getByText('tr')).toBeVisible();
  });

  it('restores stored English', async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    renderProbe();
    expect(await screen.findByText('Overview')).toBeVisible();
  });

  it('rejects an invalid stored locale', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'de');
    renderProbe();
    expect(screen.getByText('Genel Bakış')).toBeVisible();
  });

  it('switches locale without a reload', () => {
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(screen.getByText('Overview')).toBeVisible();
  });

  it('persists a locale switch', () => {
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('updates the document language', async () => {
    renderProbe();
    fireEvent.click(screen.getByRole('button', { name: 'switch' }));
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  it('keeps dictionary keys in parity', () => {
    expect(Object.keys(trMessages).sort()).toEqual(Object.keys(enMessages).sort());
  });

  it('reports a missing key outside production', () => {
    expect(() => translate('tr', 'missing.key' as TranslationKey)).toThrow(
      'Missing translation key',
    );
  });

  it('interpolates plain values without HTML injection', () => {
    expect(translate('tr', 'overview.online', { count: 5 })).toBe('5 çevrimiçi');
    expect(translate('en', 'overview.online', { count: '<b>5</b>' })).toBe('<b>5</b> online');
  });

  it('falls back to Turkish when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    renderProbe();
    expect(screen.getByText('Genel Bakış')).toBeVisible();
    spy.mockRestore();
  });
});

describe('localized formatters', () => {
  it('formats a Turkish number', () => expect(formatLocalizedNumber('tr', 1234.5)).toBe('1.234,5'));
  it('formats an English number', () =>
    expect(formatLocalizedNumber('en', 1234.5)).toBe('1,234.5'));
  it('formats a Turkish percent', () =>
    expect(formatLocalizedPercent('tr', 0.255)).toContain('25,5'));
  it('formats an English percent', () => expect(formatLocalizedPercent('en', 0.255)).toBe('25.5%'));
  it('formats Turkish and English dates differently', () => {
    const value = '2026-06-15T20:30:00.000Z';
    expect(formatLocalizedDateTime('tr', value)).not.toBe(formatLocalizedDateTime('en', value));
  });
  it('formats a bounded duration', () =>
    expect(formatLocalizedDuration('tr', 65_000)).toBe('1:05'));
  it('handles invalid numbers safely', () => {
    expect(formatLocalizedNumber('tr', Number.NaN)).toBe('—');
    expect(formatLocalizedNumber('en', Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('localized enum display labels', () => {
  it.each([
    ['AUTO_ADAPTIVE', 'Otomatik adaptif', 'Auto adaptive'],
    ['HEALTHY', 'Sağlıklı', 'Healthy'],
    ['PRE_LIGHT', 'Ön aydınlatma', 'Pre-light'],
    ['CRITICAL', 'Kritik', 'Critical'],
    ['MEASURED', 'Ölçülen', 'Measured'],
    ['RECONNECTING', 'Yeniden bağlanıyor', 'Reconnecting'],
  ])('maps %s without changing its canonical value', (value, turkish, english) => {
    expect(displayEnumLabel('tr', value)).toBe(turkish);
    expect(displayEnumLabel('en', value)).toBe(english);
    expect(value).toMatch(/^[A-Z_]+$/);
  });

  it('uses a safe unknown fallback', () => {
    expect(displayEnumLabel('tr', 'FUTURE_STATE')).toBe('Bilinmiyor (FUTURE_STATE)');
    expect(displayEnumLabel('en', 'FUTURE_STATE')).toBe('Unknown (FUTURE_STATE)');
  });
});
