import type { Locale } from './locale';
import { messages, type TranslationKey } from './messages';

const knownValues = new Set([
  'AUTO_ADAPTIVE',
  'SCHEDULED',
  'MANUAL',
  'MAINTENANCE',
  'FAIL_SAFE',
  'ONLINE',
  'OFFLINE',
  'HEALTHY',
  'DEGRADED',
  'ERROR',
  'UNKNOWN',
  'OFF',
  'STANDBY',
  'PRE_LIGHT',
  'ACTIVE',
  'INACTIVE',
  'INFO',
  'WARNING',
  'CRITICAL',
  'RESOLVED',
  'MEASURED',
  'CALCULATED',
  'ESTIMATED',
  'SIMULATED',
  'NOMINAL',
  'CONNECTING',
  'CONNECTED',
  'RECONNECTING',
  'DISCONNECTED',
  'LIVE',
  'FADING',
  'FAULT',
  'LOST',
  'EMERGENCY',
  'GOOD',
  'STALE',
  'INVALID',
  'IR',
  'BH1750',
  'INA219',
]);

export function displayEnumLabel(locale: Locale, value: string): string {
  if (!knownValues.has(value)) return messages[locale]['enum.unknown'].replace('{value}', value);
  return messages[locale][`enum.${value}` as TranslationKey];
}
