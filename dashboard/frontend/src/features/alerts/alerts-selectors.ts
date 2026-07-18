import { ACTIVITY_ENTITIES, getTimeRangeStart } from '@/features/activity/activity-model';
import type { AlertFilters, AlertRecord, AlertSummary } from './alerts-model';

export const filterAlertsBySeverity = (
  records: readonly AlertRecord[],
  severity: AlertFilters['severity'],
): readonly AlertRecord[] =>
  severity === 'ALL' ? [...records] : records.filter((record) => record.severity === severity);

export const filterAlertsByStatus = (
  records: readonly AlertRecord[],
  status: AlertFilters['status'],
): readonly AlertRecord[] =>
  status === 'ALL' ? [...records] : records.filter((record) => record.status === status);

export const filterAlertsByEntity = (
  records: readonly AlertRecord[],
  entityId: AlertFilters['entityId'],
): readonly AlertRecord[] =>
  entityId === 'ALL' ? [...records] : records.filter((record) => record.entityId === entityId);

export const filterAlertsByTimeRange = (
  records: readonly AlertRecord[],
  timeRange: AlertFilters['timeRange'],
  windowEnd: string,
): readonly AlertRecord[] => {
  const start = getTimeRangeStart(timeRange, windowEnd);
  if (start === null) return [...records];
  const end = Date.parse(windowEnd);
  return records.filter((record) => {
    const timestamp = Date.parse(record.createdAt);
    return timestamp >= start && timestamp <= end;
  });
};

export const sortAlertsNewestFirst = (records: readonly AlertRecord[]): readonly AlertRecord[] =>
  [...records].sort(
    (left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt) || right.sequence - left.sequence,
  );

export const applyAlertFilters = (
  records: readonly AlertRecord[],
  filters: AlertFilters,
  windowEnd: string,
): readonly AlertRecord[] =>
  sortAlertsNewestFirst(
    filterAlertsByTimeRange(
      filterAlertsByEntity(
        filterAlertsByStatus(filterAlertsBySeverity(records, filters.severity), filters.status),
        filters.entityId,
      ),
      filters.timeRange,
      windowEnd,
    ),
  );

export const getAlertById = (records: readonly AlertRecord[], id: string): AlertRecord | null =>
  records.find((record) => record.id === id) ?? null;

export const getAlertSummary = (records: readonly AlertRecord[]): AlertSummary => ({
  totalAlerts: records.length,
  activeAlerts: records.filter((record) => record.status === 'ACTIVE').length,
  resolvedAlerts: records.filter((record) => record.status === 'RESOLVED').length,
  criticalAlerts: records.filter((record) => record.severity === 'CRITICAL').length,
  warningAlerts: records.filter((record) => record.severity === 'WARNING').length,
  latestAlertTimestamp: sortAlertsNewestFirst(records)[0]?.createdAt ?? null,
});

export const getFilteredAlertCount = (records: readonly AlertRecord[]): number => records.length;

export const getAvailableAlertEntities = (records: readonly AlertRecord[]): readonly string[] => {
  const present = new Set(records.map((record) => record.entityId));
  return ACTIVITY_ENTITIES.filter((entity) => present.has(entity.entityId)).map(
    (entity) => entity.entityId,
  );
};
