export type GaugeMeterModel =
  | Readonly<{
      valid: true;
      displayValue: string;
      percent: number;
      strokeDasharray: number;
      strokeDashoffset: number;
    }>
  | Readonly<{
      valid: false;
      displayValue: 'Unavailable';
      reason: string;
    }>;

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');

export function createGaugeMeterModel(value: number, max: number): GaugeMeterModel {
  if (!Number.isFinite(max) || max <= 0) {
    return { valid: false, displayValue: 'Unavailable', reason: 'Maximum must be above zero.' };
  }
  if (!Number.isFinite(value)) {
    return { valid: false, displayValue: 'Unavailable', reason: 'Value must be finite.' };
  }
  if (value < 0) {
    return { valid: false, displayValue: 'Unavailable', reason: 'Value cannot be negative.' };
  }
  if (value > max) {
    return { valid: false, displayValue: 'Unavailable', reason: 'Value exceeds maximum.' };
  }

  const percent = (value / max) * 100;
  return {
    valid: true,
    displayValue: formatNumber(value),
    percent,
    strokeDasharray: CIRCUMFERENCE,
    strokeDashoffset: CIRCUMFERENCE * (1 - percent / 100),
  };
}
