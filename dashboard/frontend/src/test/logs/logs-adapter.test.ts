import { describe, expect, it } from 'vitest';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptLogs } from '@/features/logs/logs-adapter';

const logAt = (index = 0): Record<string, unknown> =>
  structuredClone(activityFixture.logs[index]) as Record<string, unknown>;

const metadata = (record: Record<string, unknown>): Record<string, unknown> =>
  record.metadata as Record<string, unknown>;

describe('adaptLogs', () => {
  it('maps the complete fixture into presentation records', () => {
    const result = adaptLogs(activityFixture.logs);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.records).toHaveLength(42);
  });
  it('maps contract and presentation fields without inventing values', () => {
    const result = adaptLogs([activityFixture.logs[34]]);
    if (!result.ok) throw new Error('Expected valid log');
    expect(result.records[0]).toMatchObject({
      id: 'LOG_SIM_035',
      level: 'ERROR',
      category: 'NODE',
      entityId: 'node-2',
      scenarioId: 'node-offline',
      dataSource: 'SIMULATED',
    });
  });
  it('accepts an empty fixture', () => expect(adaptLogs([])).toEqual({ ok: true, records: [] }));
  it('rejects a malformed contract record safely', () => {
    expect(adaptLogs([{ id: 'BROKEN' }])).toMatchObject({
      ok: false,
      error: { code: 'INVALID_RECORD', recordId: 'BROKEN' },
    });
  });
  it('rejects duplicate IDs', () => {
    const record = logAt();
    expect(adaptLogs([record, structuredClone(record)])).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_ID', recordId: 'LOG_SIM_001' },
    });
  });
  it('rejects an unknown entity', () => {
    const record = logAt();
    record.source = { entityType: 'SYSTEM', entityId: 'unknown-system' };
    expect(adaptLogs([record])).toMatchObject({ ok: false, error: { code: 'UNKNOWN_ENTITY' } });
  });
  it('rejects a canonical ID paired with the wrong entity type', () => {
    const record = logAt();
    record.source = { entityType: 'NODE', entityId: 'system' };
    expect(adaptLogs([record])).toMatchObject({ ok: false, error: { code: 'UNKNOWN_ENTITY' } });
  });
  it('rejects an unsupported category', () => {
    const record = logAt();
    metadata(record).category = 'NETWORK';
    expect(adaptLogs([record])).toMatchObject({
      ok: false,
      error: { code: 'UNKNOWN_CATEGORY' },
    });
  });
  it('rejects an unsupported level', () => {
    const record = logAt();
    metadata(record).level = 'DEBUG';
    expect(adaptLogs([record])).toMatchObject({ ok: false, error: { code: 'UNKNOWN_LEVEL' } });
  });
  it.each(['sequence', 'details', 'dataSource'])(
    'rejects missing %s presentation metadata',
    (key) => {
      const record = logAt();
      delete metadata(record)[key];
      expect(adaptLogs([record])).toMatchObject({
        ok: false,
        error: { code: 'INVALID_RECORD' },
      });
    },
  );
  it('does not mutate the raw fixture record', () => {
    const before = structuredClone(activityFixture.logs[0]);
    adaptLogs([activityFixture.logs[0]]);
    expect(activityFixture.logs[0]).toEqual(before);
  });
});
