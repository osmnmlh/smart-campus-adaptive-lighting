import { describe, expect, it } from 'vitest';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptLogs } from '@/features/logs/logs-adapter';
import { DEFAULT_LOG_FILTERS, type LogFilters } from '@/features/logs/logs-model';
import {
  applyLogFilters,
  filterLogsByCategory,
  filterLogsByEntity,
  filterLogsByLevel,
  filterLogsByTimeRange,
  getAvailableLogEntities,
  getFilteredLogCount,
  getLogById,
  getLogSummary,
  sortLogsNewestFirst,
} from '@/features/logs/logs-selectors';

const adapted = adaptLogs(activityFixture.logs);
if (!adapted.ok) throw new Error('Expected valid log fixture');
const records = adapted.records;

describe('log selectors', () => {
  it.each([
    ['SYSTEM', 4],
    ['SCENARIO', 7],
    ['SENSOR', 8],
    ['DIRECTION', 2],
    ['LAMP', 7],
    ['NODE', 6],
    ['ALERT', 8],
  ] as const)('filters %s category to %i records', (category, count) => {
    expect(filterLogsByCategory(records, category)).toHaveLength(count);
  });
  it.each([
    ['INFO', 29],
    ['WARNING', 11],
    ['ERROR', 2],
  ] as const)('filters %s level to %i records', (level, count) => {
    expect(filterLogsByLevel(records, level)).toHaveLength(count);
  });
  it.each([
    ['15m', 10],
    ['60m', 18],
    ['24h', 42],
    ['all', 42],
  ] as const)('filters %s deterministic range to %i records', (timeRange, count) => {
    expect(filterLogsByTimeRange(records, timeRange, activityFixture.windowEnd)).toHaveLength(
      count,
    );
  });
  it('filters by canonical entity ID', () => {
    expect(filterLogsByEntity(records, 'node-2').map(({ id }) => id)).toEqual([
      'LOG_SIM_035',
      'LOG_SIM_037',
    ]);
  });
  it('returns a copy for every ALL filter', () => {
    expect(filterLogsByCategory(records, 'ALL')).not.toBe(records);
    expect(filterLogsByLevel(records, 'ALL')).not.toBe(records);
    expect(filterLogsByEntity(records, 'ALL')).not.toBe(records);
  });
  it('sorts newest first and uses sequence for timestamp ties', () => {
    const result = sortLogsNewestFirst(records);
    expect(result[0]?.id).toBe('LOG_SIM_042');
    expect(result.findIndex(({ id }) => id === 'LOG_SIM_041')).toBeLessThan(
      result.findIndex(({ id }) => id === 'LOG_SIM_040'),
    );
  });
  it('does not mutate input while sorting', () => {
    const ids = records.map(({ id }) => id);
    sortLogsNewestFirst(records);
    expect(records.map(({ id }) => id)).toEqual(ids);
  });
  it('combines category, level, entity and time filters', () => {
    const filters: LogFilters = {
      category: 'ALERT',
      level: 'ERROR',
      entityId: 'node-2',
      timeRange: '15m',
    };
    expect(
      applyLogFilters(records, filters, activityFixture.windowEnd).map(({ id }) => id),
    ).toEqual(['LOG_SIM_037']);
  });
  it('returns all records newest first for default filters', () => {
    const result = applyLogFilters(records, DEFAULT_LOG_FILTERS, activityFixture.windowEnd);
    expect(result).toHaveLength(42);
    expect(result[0]?.id).toBe('LOG_SIM_042');
    expect(result.at(-1)?.id).toBe('LOG_SIM_001');
  });
  it('finds a record by ID and returns null for an unknown ID', () => {
    expect(getLogById(records, 'LOG_SIM_035')?.summary).toBe('NODE_2 went offline');
    expect(getLogById(records, 'MISSING')).toBeNull();
  });
  it('summarizes the full fixture', () => {
    expect(getLogSummary(records)).toEqual({
      totalLogs: 42,
      infoLogs: 29,
      warningLogs: 11,
      errorLogs: 2,
      latestLogTimestamp: '2026-06-15T20:30:00.000Z',
    });
  });
  it('summarizes an empty fixture without a fake timestamp', () => {
    expect(getLogSummary([])).toEqual({
      totalLogs: 0,
      infoLogs: 0,
      warningLogs: 0,
      errorLogs: 0,
      latestLogTimestamp: null,
    });
  });
  it('reports filtered count directly', () => expect(getFilteredLogCount(records)).toBe(42));
  it('returns available entities in canonical order', () => {
    const entities = getAvailableLogEntities(records);
    expect(entities[0]).toBe('system');
    expect(entities).toContain('sensor-bh1750-1');
    expect(entities).toHaveLength(15);
  });
});
