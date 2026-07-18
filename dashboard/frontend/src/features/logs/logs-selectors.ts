import { ACTIVITY_ENTITIES, getTimeRangeStart } from '@/features/activity/activity-model';
import type { LogFilters, LogRecord, LogSummary } from './logs-model';

export const filterLogsByCategory = (
  records: readonly LogRecord[],
  category: LogFilters['category'],
): readonly LogRecord[] =>
  category === 'ALL' ? [...records] : records.filter((record) => record.category === category);

export const filterLogsByLevel = (
  records: readonly LogRecord[],
  level: LogFilters['level'],
): readonly LogRecord[] =>
  level === 'ALL' ? [...records] : records.filter((record) => record.level === level);

export const filterLogsByEntity = (
  records: readonly LogRecord[],
  entityId: LogFilters['entityId'],
): readonly LogRecord[] =>
  entityId === 'ALL' ? [...records] : records.filter((record) => record.entityId === entityId);

export const filterLogsByTimeRange = (
  records: readonly LogRecord[],
  timeRange: LogFilters['timeRange'],
  windowEnd: string,
): readonly LogRecord[] => {
  const start = getTimeRangeStart(timeRange, windowEnd);
  if (start === null) return [...records];
  const end = Date.parse(windowEnd);
  return records.filter((record) => {
    const timestamp = Date.parse(record.timestamp);
    return timestamp >= start && timestamp <= end;
  });
};

export const sortLogsNewestFirst = (records: readonly LogRecord[]): readonly LogRecord[] =>
  [...records].sort(
    (left, right) =>
      Date.parse(right.timestamp) - Date.parse(left.timestamp) || right.sequence - left.sequence,
  );

export const applyLogFilters = (
  records: readonly LogRecord[],
  filters: LogFilters,
  windowEnd: string,
): readonly LogRecord[] =>
  sortLogsNewestFirst(
    filterLogsByTimeRange(
      filterLogsByEntity(
        filterLogsByLevel(filterLogsByCategory(records, filters.category), filters.level),
        filters.entityId,
      ),
      filters.timeRange,
      windowEnd,
    ),
  );

export const getLogById = (records: readonly LogRecord[], id: string): LogRecord | null =>
  records.find((record) => record.id === id) ?? null;

export const getLogSummary = (records: readonly LogRecord[]): LogSummary => ({
  totalLogs: records.length,
  infoLogs: records.filter((record) => record.level === 'INFO').length,
  warningLogs: records.filter((record) => record.level === 'WARNING').length,
  errorLogs: records.filter((record) => record.level === 'ERROR').length,
  latestLogTimestamp: sortLogsNewestFirst(records)[0]?.timestamp ?? null,
});

export const getFilteredLogCount = (records: readonly LogRecord[]): number => records.length;

export const getAvailableLogEntities = (records: readonly LogRecord[]): readonly string[] => {
  const present = new Set(records.map((record) => record.entityId));
  return ACTIVITY_ENTITIES.filter((entity) => present.has(entity.entityId)).map(
    (entity) => entity.entityId,
  );
};
