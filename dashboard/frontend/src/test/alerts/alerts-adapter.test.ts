import { describe, expect, it } from 'vitest';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptAlerts } from '@/features/alerts/alerts-adapter';

const alertAt = (index = 0): Record<string, unknown> =>
  structuredClone(activityFixture.alerts[index]) as Record<string, unknown>;

const metadata = (record: Record<string, unknown>): Record<string, unknown> =>
  record.metadata as Record<string, unknown>;

describe('adaptAlerts', () => {
  it('maps the complete fixture into presentation records', () => {
    const result = adaptAlerts(activityFixture.alerts);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.records).toHaveLength(15);
  });
  it('maps contract and presentation fields without inventing values', () => {
    const result = adaptAlerts([activityFixture.alerts[0]]);
    if (!result.ok) throw new Error('Expected valid alert');
    expect(result.records[0]).toMatchObject({
      id: 'ALERT_SIM_001',
      code: 'NODE_OFFLINE',
      title: 'NODE_2 offline',
      entityId: 'node-2',
      scenarioId: 'node-offline',
      dataSource: 'SIMULATED',
    });
  });
  it('accepts an empty fixture', () => expect(adaptAlerts([])).toEqual({ ok: true, records: [] }));
  it('rejects a malformed contract record safely', () => {
    expect(adaptAlerts([{ id: 'BROKEN' }])).toMatchObject({
      ok: false,
      error: { code: 'INVALID_RECORD', recordId: 'BROKEN' },
    });
  });
  it('rejects duplicate IDs', () => {
    const record = alertAt();
    expect(adaptAlerts([record, structuredClone(record)])).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_ID', recordId: 'ALERT_SIM_001' },
    });
  });
  it('rejects an unknown entity', () => {
    const record = alertAt();
    record.sourceEntity = { entityType: 'NODE', entityId: 'node-99' };
    expect(adaptAlerts([record])).toMatchObject({ ok: false, error: { code: 'UNKNOWN_ENTITY' } });
  });
  it('rejects a canonical ID paired with the wrong entity type', () => {
    const record = alertAt();
    record.sourceEntity = { entityType: 'LAMP', entityId: 'node-2' };
    expect(adaptAlerts([record])).toMatchObject({ ok: false, error: { code: 'UNKNOWN_ENTITY' } });
  });
  it('rejects timestamps that move backward', () => {
    const record = alertAt();
    record.lastObservedAt = '2026-06-15T20:19:00.000Z';
    expect(adaptAlerts([record])).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TIMESTAMP' },
    });
  });
  it('rejects an active record with a resolved timestamp', () => {
    const record = alertAt();
    record.resolvedAt = '2026-06-15T20:29:00.000Z';
    expect(adaptAlerts([record])).toMatchObject({ ok: false, error: { code: 'INVALID_STATUS' } });
  });
  it('rejects a resolved record without a resolved timestamp', () => {
    const record = alertAt(1);
    delete record.resolvedAt;
    expect(adaptAlerts([record])).toMatchObject({ ok: false, error: { code: 'INVALID_STATUS' } });
  });
  it.each(['title', 'description', 'scenarioId', 'sequence', 'dataSource'])(
    'rejects missing %s presentation metadata',
    (key) => {
      const record = alertAt();
      delete metadata(record)[key];
      expect(adaptAlerts([record])).toMatchObject({
        ok: false,
        error: { code: 'INVALID_RECORD' },
      });
    },
  );
  it('does not mutate the raw fixture record', () => {
    const before = structuredClone(activityFixture.alerts[0]);
    adaptAlerts([activityFixture.alerts[0]]);
    expect(activityFixture.alerts[0]).toEqual(before);
  });
});
