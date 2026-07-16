import {
  Direction,
  LampOperatingState,
  type Direction as DirectionValue,
  type LampOperatingState as LampOperatingStateValue,
} from '@smart-campus/contracts';

import { ScenarioValidationError } from './scenario-errors.js';

export const CANONICAL_LAMP_IDS = ['lamp-1', 'lamp-2', 'lamp-3', 'lamp-4', 'lamp-5'] as const;
export type CanonicalLampId = (typeof CANONICAL_LAMP_IDS)[number];

export const BRIGHTNESS_LEVELS = Object.freeze({
  OFF: 0,
  STANDBY: 30,
  PRE_LIGHT: 60,
  ACTIVE: 100,
});

/** Configurable mock defaults, not production or physical-control standards. */
export const MOCK_BRIGHTNESS_TIMING = Object.freeze({
  holdDurationMs: 30_000,
  fadeDurationMs: 10_000,
});

export interface BrightnessDecision {
  brightnessPercent: number;
  targetBrightnessPercent: number;
  pwmDutyPercent: number;
  operatingState: LampOperatingStateValue;
  fadeRemainingMs: number;
}

export interface BrightnessPolicyInput {
  nowMs: number;
  activeLampIds: readonly CanonicalLampId[];
  direction: DirectionValue;
  inactiveSinceMs: number | null;
  lastPresenceLevels: Readonly<Record<CanonicalLampId, number>>;
  off: boolean;
  holdDurationMs?: number;
  fadeDurationMs?: number;
}

export const standbyLevels = (): Record<CanonicalLampId, number> => ({
  'lamp-1': BRIGHTNESS_LEVELS.STANDBY,
  'lamp-2': BRIGHTNESS_LEVELS.STANDBY,
  'lamp-3': BRIGHTNESS_LEVELS.STANDBY,
  'lamp-4': BRIGHTNESS_LEVELS.STANDBY,
  'lamp-5': BRIGHTNESS_LEVELS.STANDBY,
});

export const calculatePresenceLevels = (
  activeLampIds: readonly CanonicalLampId[],
  direction: DirectionValue,
): Record<CanonicalLampId, number> => {
  const levels = standbyLevels();
  const activeIndexes = activeLampIds.map((lampId) => CANONICAL_LAMP_IDS.indexOf(lampId));

  activeLampIds.forEach((lampId) => {
    levels[lampId] = BRIGHTNESS_LEVELS.ACTIVE;
  });

  if (
    activeLampIds.includes('lamp-3') &&
    direction !== Direction.LEFT_TO_RIGHT &&
    direction !== Direction.RIGHT_TO_LEFT
  ) {
    levels['lamp-2'] = Math.max(levels['lamp-2'], BRIGHTNESS_LEVELS.PRE_LIGHT);
    levels['lamp-4'] = Math.max(levels['lamp-4'], BRIGHTNESS_LEVELS.PRE_LIGHT);
  }

  if (activeIndexes.length > 0 && direction === Direction.LEFT_TO_RIGHT) {
    const nextIndex = Math.max(...activeIndexes) + 1;
    const nextLamp = CANONICAL_LAMP_IDS[nextIndex];
    if (nextLamp !== undefined && !activeLampIds.includes(nextLamp)) {
      levels[nextLamp] = BRIGHTNESS_LEVELS.PRE_LIGHT;
    }
  }

  if (activeIndexes.length > 0 && direction === Direction.RIGHT_TO_LEFT) {
    const nextIndex = Math.min(...activeIndexes) - 1;
    const nextLamp = CANONICAL_LAMP_IDS[nextIndex];
    if (nextLamp !== undefined && !activeLampIds.includes(nextLamp)) {
      levels[nextLamp] = BRIGHTNESS_LEVELS.PRE_LIGHT;
    }
  }

  return levels;
};

const validateTiming = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new ScenarioValidationError(`${label} must be a non-negative integer`);
  }
};

const clampPercentage = (value: number): number => Math.min(100, Math.max(0, value));

const operatingStateFor = (brightnessPercent: number, fading: boolean): LampOperatingStateValue => {
  if (brightnessPercent === BRIGHTNESS_LEVELS.OFF) return LampOperatingState.OFF;
  if (fading) return LampOperatingState.FADING;
  if (brightnessPercent === BRIGHTNESS_LEVELS.ACTIVE) return LampOperatingState.ACTIVE;
  if (brightnessPercent === BRIGHTNESS_LEVELS.PRE_LIGHT) return LampOperatingState.PRE_LIGHT;
  return LampOperatingState.STANDBY;
};

export const calculateBrightnessPolicy = (
  input: BrightnessPolicyInput,
): Record<CanonicalLampId, BrightnessDecision> => {
  const holdDurationMs = input.holdDurationMs ?? MOCK_BRIGHTNESS_TIMING.holdDurationMs;
  const fadeDurationMs = input.fadeDurationMs ?? MOCK_BRIGHTNESS_TIMING.fadeDurationMs;
  validateTiming(input.nowMs, 'nowMs');
  validateTiming(holdDurationMs, 'holdDurationMs');
  validateTiming(fadeDurationMs, 'fadeDurationMs');

  let levels: Record<CanonicalLampId, number>;
  let fading = false;
  let fadeRemainingMs = 0;

  if (input.off) {
    levels = { 'lamp-1': 0, 'lamp-2': 0, 'lamp-3': 0, 'lamp-4': 0, 'lamp-5': 0 };
  } else if (input.activeLampIds.length > 0) {
    levels = calculatePresenceLevels(input.activeLampIds, input.direction);
  } else if (input.inactiveSinceMs === null) {
    levels = standbyLevels();
  } else {
    const inactiveElapsedMs = Math.max(0, input.nowMs - input.inactiveSinceMs);

    if (inactiveElapsedMs <= holdDurationMs) {
      levels = { ...input.lastPresenceLevels };
    } else {
      const fadeElapsedMs = inactiveElapsedMs - holdDurationMs;
      if (fadeDurationMs === 0 || fadeElapsedMs >= fadeDurationMs) {
        levels = standbyLevels();
      } else {
        fading = true;
        fadeRemainingMs = fadeDurationMs - fadeElapsedMs;
        const progress = fadeElapsedMs / fadeDurationMs;
        levels = Object.fromEntries(
          CANONICAL_LAMP_IDS.map((lampId) => [
            lampId,
            clampPercentage(
              input.lastPresenceLevels[lampId] +
                (BRIGHTNESS_LEVELS.STANDBY - input.lastPresenceLevels[lampId]) * progress,
            ),
          ]),
        ) as Record<CanonicalLampId, number>;
      }
    }
  }

  return Object.fromEntries(
    CANONICAL_LAMP_IDS.map((lampId) => {
      const brightnessPercent = clampPercentage(levels[lampId]);
      const targetBrightnessPercent = fading ? BRIGHTNESS_LEVELS.STANDBY : brightnessPercent;

      return [
        lampId,
        {
          brightnessPercent,
          targetBrightnessPercent,
          pwmDutyPercent: brightnessPercent,
          operatingState: operatingStateFor(brightnessPercent, fading),
          fadeRemainingMs,
        },
      ];
    }),
  ) as Record<CanonicalLampId, BrightnessDecision>;
};
