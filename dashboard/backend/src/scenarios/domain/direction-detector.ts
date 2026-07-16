import {
  Direction,
  type Direction as DirectionValue,
  type SensorId,
} from '@smart-campus/contracts';

import { ScenarioValidationError } from './scenario-errors.js';

export const MOCK_DIRECTION_CORRELATION_WINDOW_MS = 3_000;

type EntrySensorId = 'sensor-ir-1' | 'sensor-ir-5';

export interface DirectionDetectorState {
  pendingSensorId: EntrySensorId | null;
  pendingAtMs: number | null;
}

export interface DirectionDetectionResult {
  state: DirectionDetectorState;
  direction: DirectionValue | null;
  confirmedBySensorIds: SensorId[];
}

export const createDirectionDetectorState = (): DirectionDetectorState => ({
  pendingSensorId: null,
  pendingAtMs: null,
});

export const detectDirection = (
  state: Readonly<DirectionDetectorState>,
  sensorId: SensorId,
  atMs: number,
  correlationWindowMs = MOCK_DIRECTION_CORRELATION_WINDOW_MS,
): DirectionDetectionResult => {
  if (!Number.isInteger(atMs) || atMs < 0) {
    throw new ScenarioValidationError('Direction event time must be a non-negative integer');
  }

  if (!Number.isInteger(correlationWindowMs) || correlationWindowMs <= 0) {
    throw new ScenarioValidationError('Correlation window must be a positive integer');
  }

  const pendingExpired =
    state.pendingAtMs !== null && atMs - state.pendingAtMs > correlationWindowMs;
  const current = pendingExpired ? createDirectionDetectorState() : { ...state };

  if (sensorId === 'sensor-ir-1' || sensorId === 'sensor-ir-5') {
    return {
      state: { pendingSensorId: sensorId, pendingAtMs: atMs },
      direction: null,
      confirmedBySensorIds: [],
    };
  }

  if (
    sensorId === 'sensor-ir-2' &&
    current.pendingSensorId === 'sensor-ir-1' &&
    current.pendingAtMs !== null &&
    atMs - current.pendingAtMs <= correlationWindowMs
  ) {
    return {
      state: createDirectionDetectorState(),
      direction: Direction.LEFT_TO_RIGHT,
      confirmedBySensorIds: ['sensor-ir-1', 'sensor-ir-2'],
    };
  }

  if (
    sensorId === 'sensor-ir-4' &&
    current.pendingSensorId === 'sensor-ir-5' &&
    current.pendingAtMs !== null &&
    atMs - current.pendingAtMs <= correlationWindowMs
  ) {
    return {
      state: createDirectionDetectorState(),
      direction: Direction.RIGHT_TO_LEFT,
      confirmedBySensorIds: ['sensor-ir-5', 'sensor-ir-4'],
    };
  }

  return { state: current, direction: null, confirmedBySensorIds: [] };
};
