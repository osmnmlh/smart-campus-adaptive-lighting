import { describe, expect, it } from 'vitest';
import { DashboardCommandSchema } from '../src/index.js';
import { commandBase } from './fixtures.js';

describe('dashboard command schema', () => {
  it('accepts SET_LAMP_BRIGHTNESS with a lamp target', () => {
    expect(
      DashboardCommandSchema.safeParse({
        ...commandBase,
        type: 'SET_LAMP_BRIGHTNESS',
        target: { entityType: 'LAMP', lampId: 'lamp-1' },
        payload: { brightnessPercent: 60 },
      }).success,
    ).toBe(true);
  });

  it('rejects SET_LAMP_BRIGHTNESS with a non-lamp target', () => {
    expect(
      DashboardCommandSchema.safeParse({
        ...commandBase,
        type: 'SET_LAMP_BRIGHTNESS',
        target: { entityType: 'NODE', lampId: 'lamp-1' },
        payload: { brightnessPercent: 60 },
      }).success,
    ).toBe(false);
  });

  it('rejects CONTROL_SCENARIO with an unsupported speed', () => {
    expect(
      DashboardCommandSchema.safeParse({
        ...commandBase,
        type: 'CONTROL_SCENARIO',
        payload: { action: 'SET_SPEED', speed: 3 },
      }).success,
    ).toBe(false);
  });

  it('rejects irrelevant fields for a PAUSE action', () => {
    expect(
      DashboardCommandSchema.safeParse({
        ...commandBase,
        type: 'CONTROL_SCENARIO',
        payload: { action: 'PAUSE', stepMs: 1000 },
      }).success,
    ).toBe(false);
  });

  it('accepts RESET_SCENARIO only with an empty payload', () => {
    expect(
      DashboardCommandSchema.safeParse({
        ...commandBase,
        type: 'RESET_SCENARIO',
        payload: {},
      }).success,
    ).toBe(true);
    expect(
      DashboardCommandSchema.safeParse({
        ...commandBase,
        type: 'RESET_SCENARIO',
        payload: { force: true },
      }).success,
    ).toBe(false);
  });
});
