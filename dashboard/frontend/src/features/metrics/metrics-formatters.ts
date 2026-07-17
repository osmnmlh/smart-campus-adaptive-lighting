import type { MetricUnit } from '@smart-campus/contracts';

export function formatMetricTimestamp(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}

export function formatChartTimestamp(value: string): string {
  return `${value.slice(11, 16)} UTC`;
}

export function metricUnitLabel(unit: MetricUnit): string {
  if (unit === 'PERCENT') return '%';
  if (unit === 'LX') return 'lx';
  if (unit === 'BOOLEAN') return 'Active state';
  return unit;
}

export function formatMetricValue(value: number, unit: MetricUnit): string {
  if (unit === 'BOOLEAN') return value === 1 ? 'Active' : 'Inactive';
  return `${value}${unit === 'PERCENT' ? '%' : unit === 'LX' ? ' lx' : ` ${unit}`}`;
}
