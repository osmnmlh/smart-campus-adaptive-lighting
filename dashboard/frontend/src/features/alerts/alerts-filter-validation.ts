import { AlertSeverity, AlertStatus } from '@smart-campus/contracts';
import { isTimeRange } from '@/features/activity/activity-model';
import type { AlertFilters } from './alerts-model';

export type AlertFilterValidationResult =
  Readonly<{ ok: true; filters: AlertFilters }> | Readonly<{ ok: false; message: string }>;

export function parseAlertFilters(
  input: unknown,
  availableEntities: readonly string[],
): AlertFilterValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, message: 'Alert filters are not valid.' };
  }
  const value = input as Readonly<Record<string, unknown>>;
  const severities = ['ALL', ...Object.values(AlertSeverity)];
  const statuses = ['ALL', ...Object.values(AlertStatus)];
  if (typeof value.severity !== 'string' || !severities.includes(value.severity)) {
    return { ok: false, message: 'Select a supported alert severity.' };
  }
  if (typeof value.status !== 'string' || !statuses.includes(value.status)) {
    return { ok: false, message: 'Select a supported alert status.' };
  }
  if (
    typeof value.entityId !== 'string' ||
    (value.entityId !== 'ALL' && !availableEntities.includes(value.entityId))
  ) {
    return { ok: false, message: 'Select an entity from the simulated dataset.' };
  }
  if (!isTimeRange(value.timeRange)) {
    return { ok: false, message: 'Select a supported deterministic time range.' };
  }
  return {
    ok: true,
    filters: {
      severity: value.severity as AlertFilters['severity'],
      status: value.status as AlertFilters['status'],
      entityId: value.entityId,
      timeRange: value.timeRange,
    },
  };
}
