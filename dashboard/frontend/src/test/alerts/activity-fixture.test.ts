import { DataSource, EntityType } from '@smart-campus/contracts';
import { describe, expect, it } from 'vitest';
import { activityFixture } from '@/features/activity/activity-fixture';
import { ACTIVITY_ENTITIES } from '@/features/activity/activity-model';
import { adaptAlerts } from '@/features/alerts/alerts-adapter';
import { LOG_CATEGORIES, LOG_LEVELS } from '@/features/logs/logs-model';
import { adaptLogs } from '@/features/logs/logs-adapter';

const metadataOf = (record: unknown): Readonly<Record<string, unknown>> => {
  if (typeof record !== 'object' || record === null || !('metadata' in record)) return {};
  return record.metadata as Readonly<Record<string, unknown>>;
};

describe('shared deterministic activity fixture', () => {
  it('contains 15 alert records', () => expect(activityFixture.alerts).toHaveLength(15));
  it('contains 42 log records', () => expect(activityFixture.logs).toHaveLength(42));
  it('uses the fixed 24-hour window', () => {
    expect(activityFixture.windowStart).toBe('2026-06-14T20:30:00.000Z');
    expect(activityFixture.windowEnd).toBe('2026-06-15T20:30:00.000Z');
  });
  it('freezes the fixture and both record collections', () => {
    expect(Object.isFrozen(activityFixture)).toBe(true);
    expect(Object.isFrozen(activityFixture.alerts)).toBe(true);
    expect(Object.isFrozen(activityFixture.logs)).toBe(true);
  });
  it('is JSON-compatible without Date, function, or undefined values', () => {
    const visit = (value: unknown): void => {
      expect(value).not.toBeInstanceOf(Date);
      expect(typeof value).not.toBe('function');
      expect(value).not.toBeUndefined();
      if (Array.isArray(value)) value.forEach(visit);
      else if (typeof value === 'object' && value !== null) Object.values(value).forEach(visit);
    };
    visit(activityFixture);
    expect(JSON.parse(JSON.stringify(activityFixture))).toEqual(activityFixture);
  });
  it('serializes to the same deterministic value repeatedly', () => {
    expect(JSON.stringify(activityFixture)).toBe(JSON.stringify(activityFixture));
  });
  it('uses unique alert IDs', () => {
    const result = adaptAlerts(activityFixture.alerts);
    expect(result.ok).toBe(true);
    if (result.ok) expect(new Set(result.records.map(({ id }) => id)).size).toBe(15);
  });
  it('uses unique log IDs', () => {
    const result = adaptLogs(activityFixture.logs);
    expect(result.ok).toBe(true);
    if (result.ok) expect(new Set(result.records.map(({ id }) => id)).size).toBe(42);
  });
  it('labels every raw record as simulated', () => {
    expect(
      [...activityFixture.alerts, ...activityFixture.logs].every(
        (record) => metadataOf(record).dataSource === DataSource.SIMULATED,
      ),
    ).toBe(true);
  });
  it('keeps every canonical entity available to at least one activity stream', () => {
    const alerts = adaptAlerts(activityFixture.alerts);
    const logs = adaptLogs(activityFixture.logs);
    if (!alerts.ok || !logs.ok) throw new Error('Expected valid fixture');
    const present = new Set([
      ...alerts.records.map(({ entityId }) => entityId),
      ...logs.records.map(({ entityId }) => entityId),
    ]);
    ACTIVITY_ENTITIES.forEach(({ entityId }) => expect(present).toContain(entityId));
  });
  it('contains exactly one node-offline alert', () => {
    const result = adaptAlerts(activityFixture.alerts);
    if (!result.ok) throw new Error('Expected valid fixture');
    expect(
      result.records.filter(
        ({ code, scenarioId }) => code === 'NODE_OFFLINE' && scenarioId === 'node-offline',
      ),
    ).toHaveLength(1);
  });
  it.each(LOG_CATEGORIES)('covers the %s log category', (category) => {
    expect(activityFixture.logs.some((record) => metadataOf(record).category === category)).toBe(
      true,
    );
  });
  it.each(LOG_LEVELS)('covers the %s log level', (level) => {
    expect(activityFixture.logs.some((record) => metadataOf(record).level === level)).toBe(true);
  });
  it.each([EntityType.SYSTEM, EntityType.NODE, EntityType.LAMP, EntityType.SENSOR])(
    'covers the %s activity entity type',
    (entityType) => {
      const alerts = adaptAlerts(activityFixture.alerts);
      const logs = adaptLogs(activityFixture.logs);
      if (!alerts.ok || !logs.ok) throw new Error('Expected valid fixture');
      expect(
        [...alerts.records, ...logs.records].some((record) => record.entityType === entityType),
      ).toBe(true);
    },
  );
});
