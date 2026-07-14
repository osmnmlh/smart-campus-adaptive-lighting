import { describe, expect, it } from 'vitest';
import { SystemSnapshotSchema } from '../src/index.js';
import { lampSnapshot, systemSnapshot } from './fixtures.js';

describe('snapshot schemas', () => {
  it('parses a valid system snapshot', () => {
    expect(SystemSnapshotSchema.safeParse(systemSnapshot).success).toBe(true);
  });

  it('rejects brightnessPercent above 100', () => {
    expect(
      SystemSnapshotSchema.safeParse({
        ...systemSnapshot,
        lamps: [{ ...lampSnapshot, brightnessPercent: 101 }],
      }).success,
    ).toBe(false);
  });

  it('rejects the ambiguous pwmDuty field', () => {
    expect(
      SystemSnapshotSchema.safeParse({
        ...systemSnapshot,
        lamps: [{ ...lampSnapshot, pwmDuty: 30 }],
      }).success,
    ).toBe(false);
  });

  it('rejects a non-UTC snapshot timestamp', () => {
    expect(
      SystemSnapshotSchema.safeParse({
        ...systemSnapshot,
        snapshotAt: '2026-01-01T03:00:00+03:00',
      }).success,
    ).toBe(false);
  });
});
