import { Direction, LampOperatingState } from '@smart-campus/contracts';

import {
  BRIGHTNESS_LEVELS,
  calculateBrightnessPolicy,
  calculatePresenceLevels,
  standbyLevels,
} from '../../src/scenarios/domain/brightness-policy.js';

describe('brightness policy', () => {
  it('sets an active zone to 100 percent', () => {
    expect(calculatePresenceLevels(['lamp-1'], Direction.UNKNOWN)['lamp-1']).toBe(
      BRIGHTNESS_LEVELS.ACTIVE,
    );
  });

  it('pre-lights the next segment in the movement direction', () => {
    expect(calculatePresenceLevels(['lamp-1', 'lamp-2'], Direction.LEFT_TO_RIGHT)['lamp-3']).toBe(
      BRIGHTNESS_LEVELS.PRE_LIGHT,
    );
  });

  it('keeps safe segments at standby', () => {
    expect(calculatePresenceLevels(['lamp-1'], Direction.UNKNOWN)['lamp-5']).toBe(
      BRIGHTNESS_LEVELS.STANDBY,
    );
  });

  it('sets every lamp to zero for an explicit off condition', () => {
    const result = calculateBrightnessPolicy({
      nowMs: 0,
      activeLampIds: ['lamp-1'],
      direction: Direction.UNKNOWN,
      inactiveSinceMs: null,
      lastPresenceLevels: standbyLevels(),
      off: true,
    });
    expect(Object.values(result).every((decision) => decision.brightnessPercent === 0)).toBe(true);
  });

  it('holds the previous levels for 30 seconds', () => {
    const activeLevels = calculatePresenceLevels(['lamp-1'], Direction.UNKNOWN);
    const result = calculateBrightnessPolicy({
      nowMs: 30_000,
      activeLampIds: [],
      direction: Direction.UNKNOWN,
      inactiveSinceMs: 0,
      lastPresenceLevels: activeLevels,
      off: false,
    });
    expect(result['lamp-1'].brightnessPercent).toBe(100);
  });

  it('fades linearly using virtual elapsed time', () => {
    const activeLevels = calculatePresenceLevels(['lamp-1'], Direction.UNKNOWN);
    const result = calculateBrightnessPolicy({
      nowMs: 35_000,
      activeLampIds: [],
      direction: Direction.UNKNOWN,
      inactiveSinceMs: 0,
      lastPresenceLevels: activeLevels,
      off: false,
    });
    expect(result['lamp-1'].brightnessPercent).toBe(65);
    expect(result['lamp-1'].operatingState).toBe(LampOperatingState.FADING);
  });

  it('returns to standby when fade completes', () => {
    const activeLevels = calculatePresenceLevels(['lamp-1'], Direction.UNKNOWN);
    const result = calculateBrightnessPolicy({
      nowMs: 40_000,
      activeLampIds: [],
      direction: Direction.UNKNOWN,
      inactiveSinceMs: 0,
      lastPresenceLevels: activeLevels,
      off: false,
    });
    expect(result['lamp-1'].brightnessPercent).toBe(30);
    expect(result['lamp-1'].operatingState).toBe(LampOperatingState.STANDBY);
  });

  it('keeps all brightness and PWM percentage fields in range', () => {
    const result = calculateBrightnessPolicy({
      nowMs: 35_000,
      activeLampIds: [],
      direction: Direction.LEFT_TO_RIGHT,
      inactiveSinceMs: 0,
      lastPresenceLevels: calculatePresenceLevels(['lamp-1', 'lamp-2'], Direction.LEFT_TO_RIGHT),
      off: false,
    });
    expect(
      Object.values(result).every(
        ({ brightnessPercent, targetBrightnessPercent, pwmDutyPercent }) =>
          [brightnessPercent, targetBrightnessPercent, pwmDutyPercent].every(
            (value) => value >= 0 && value <= 100,
          ),
      ),
    ).toBe(true);
  });
});
