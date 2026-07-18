import { AlertSeverity, AlertStatus } from '@smart-campus/contracts';
import { describe, expect, it } from 'vitest';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptAlerts } from '@/features/alerts/alerts-adapter';
import { DEFAULT_ALERT_FILTERS, type AlertFilters } from '@/features/alerts/alerts-model';
import {
  applyAlertFilters,
  filterAlertsByEntity,
  filterAlertsBySeverity,
  filterAlertsByStatus,
  filterAlertsByTimeRange,
  getAlertById,
  getAlertSummary,
  getAvailableAlertEntities,
  getFilteredAlertCount,
  sortAlertsNewestFirst,
} from '@/features/alerts/alerts-selectors';

const adapted = adaptAlerts(activityFixture.alerts);
if (!adapted.ok) throw new Error('Expected valid alert fixture');
const records = adapted.records;

describe('alert selectors', () => {
  it.each([
    ['INFO', 5],
    ['WARNING', 9],
    ['CRITICAL', 1],
    ['EMERGENCY', 0],
  ] as const)('filters %s severity to %i records', (severity, count) => {
    expect(filterAlertsBySeverity(records, AlertSeverity[severity])).toHaveLength(count);
  });
  it.each([
    ['ACTIVE', 5],
    ['RESOLVED', 10],
  ] as const)('filters %s status to %i records', (status, count) => {
    expect(filterAlertsByStatus(records, AlertStatus[status])).toHaveLength(count);
  });
  it.each([
    ['15m', 5],
    ['60m', 7],
    ['24h', 15],
    ['all', 15],
  ] as const)('filters %s deterministic range to %i records', (timeRange, count) => {
    expect(filterAlertsByTimeRange(records, timeRange, activityFixture.windowEnd)).toHaveLength(
      count,
    );
  });
  it('filters by canonical entity ID', () => {
    expect(filterAlertsByEntity(records, 'sensor-ir-2').map(({ id }) => id)).toEqual([
      'ALERT_SIM_010',
    ]);
  });
  it('returns a copy for every ALL filter', () => {
    expect(filterAlertsBySeverity(records, 'ALL')).not.toBe(records);
    expect(filterAlertsByStatus(records, 'ALL')).not.toBe(records);
    expect(filterAlertsByEntity(records, 'ALL')).not.toBe(records);
  });
  it('sorts newest first and uses sequence for timestamp ties', () => {
    const sameTime = records.slice(0, 2).map((record, index) => ({
      ...record,
      createdAt: '2026-06-15T20:00:00.000Z',
      sequence: index + 1,
    }));
    expect(sortAlertsNewestFirst(sameTime).map(({ sequence }) => sequence)).toEqual([2, 1]);
  });
  it('does not mutate input while sorting', () => {
    const ids = records.map(({ id }) => id);
    sortAlertsNewestFirst(records);
    expect(records.map(({ id }) => id)).toEqual(ids);
  });
  it('combines severity, status, entity and time filters', () => {
    const filters: AlertFilters = {
      severity: 'WARNING',
      status: 'ACTIVE',
      entityId: 'sensor-ir-2',
      timeRange: '15m',
    };
    expect(
      applyAlertFilters(records, filters, activityFixture.windowEnd).map(({ id }) => id),
    ).toEqual(['ALERT_SIM_010']);
  });
  it('returns all records newest first for default filters', () => {
    const result = applyAlertFilters(records, DEFAULT_ALERT_FILTERS, activityFixture.windowEnd);
    expect(result).toHaveLength(15);
    expect(result[0]?.id).toBe('ALERT_SIM_015');
    expect(result.at(-1)?.id).toBe('ALERT_SIM_013');
  });
  it('finds a record by ID and returns null for an unknown ID', () => {
    expect(getAlertById(records, 'ALERT_SIM_001')?.title).toBe('NODE_2 offline');
    expect(getAlertById(records, 'MISSING')).toBeNull();
  });
  it('summarizes the full fixture', () => {
    expect(getAlertSummary(records)).toEqual({
      totalAlerts: 15,
      activeAlerts: 5,
      resolvedAlerts: 10,
      criticalAlerts: 1,
      warningAlerts: 9,
      latestAlertTimestamp: '2026-06-15T20:29:00.000Z',
    });
  });
  it('summarizes an empty fixture without a fake timestamp', () => {
    expect(getAlertSummary([])).toEqual({
      totalAlerts: 0,
      activeAlerts: 0,
      resolvedAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      latestAlertTimestamp: null,
    });
  });
  it('reports filtered count directly', () => expect(getFilteredAlertCount(records)).toBe(15));
  it('returns available entities in canonical order', () => {
    const entities = getAvailableAlertEntities(records);
    expect(entities[0]).toBe('system');
    expect(entities).toContain('sensor-bh1750-1');
    expect(entities).toHaveLength(15);
  });
});
