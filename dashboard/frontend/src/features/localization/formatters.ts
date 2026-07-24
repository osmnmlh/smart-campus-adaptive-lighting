import { intlLocale, type Locale } from './locale';

export function formatLocalizedNumber(
  locale: Locale,
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(intlLocale(locale), {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function formatLocalizedPercent(locale: Locale, value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatLocalizedDateTime(locale: Locale, value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: 'UTC',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)} UTC`;
}

export function formatLocalizedDuration(locale: Locale, milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—';
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
