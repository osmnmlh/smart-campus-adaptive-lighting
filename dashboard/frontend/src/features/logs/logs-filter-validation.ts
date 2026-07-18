import { isTimeRange } from '@/features/activity/activity-model';
import { LOG_CATEGORIES, LOG_LEVELS, type LogFilters } from './logs-model';

export type LogFilterValidationResult =
  Readonly<{ ok: true; filters: LogFilters }> | Readonly<{ ok: false; message: string }>;

export function parseLogFilters(
  input: unknown,
  availableEntities: readonly string[],
): LogFilterValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, message: 'Log filters are not valid.' };
  }
  const value = input as Readonly<Record<string, unknown>>;
  const categories = ['ALL', ...LOG_CATEGORIES];
  const levels = ['ALL', ...LOG_LEVELS];
  if (typeof value.category !== 'string' || !categories.includes(value.category)) {
    return { ok: false, message: 'Select a supported log category.' };
  }
  if (typeof value.level !== 'string' || !levels.includes(value.level)) {
    return { ok: false, message: 'Select a supported log level.' };
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
      category: value.category as LogFilters['category'],
      level: value.level as LogFilters['level'],
      entityId: value.entityId,
      timeRange: value.timeRange,
    },
  };
}
