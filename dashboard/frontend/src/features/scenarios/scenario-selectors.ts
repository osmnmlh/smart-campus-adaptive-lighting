import {
  DataSource,
  Direction,
  MetricQuality,
  SystemMode,
  type ScenarioEvent,
} from '@smart-campus/contracts';
import { formatScenarioTimestamp } from './scenario-formatters';
import type {
  ScenarioControllerState,
  ScenarioLifecycle,
  ScenarioSnapshotPreview,
} from './scenario-model';

export const selectProgressPercent = (state: ScenarioControllerState): number => {
  const durationMs = state.definition?.durationMs ?? 0;
  if (durationMs === 0) return 0;
  return Math.min(100, (state.elapsedMs / durationMs) * 100);
};

export const selectRemainingEventCount = (state: ScenarioControllerState): number =>
  Math.max(0, (state.definition?.events.length ?? 0) - state.processedEventCount);

export const selectUpcomingEvents = (
  state: ScenarioControllerState,
  limit = 3,
): readonly ScenarioEvent[] =>
  state.definition?.events.slice(state.processedEventCount, state.processedEventCount + limit) ??
  [];

export const selectDirection = (state: ScenarioControllerState): Direction => {
  const processed = state.definition?.events.slice(0, state.processedEventCount) ?? [];
  if (
    processed.some(
      (event) => event.type === 'SENSOR_ACTIVATED' && event.target.entityId === 'sensor-ir-2',
    )
  ) {
    return Direction.LEFT_TO_RIGHT;
  }
  if (
    processed.some(
      (event) => event.type === 'SENSOR_ACTIVATED' && event.target.entityId === 'sensor-ir-4',
    )
  ) {
    return Direction.RIGHT_TO_LEFT;
  }
  return Direction.NONE;
};

export const selectSnapshotPreview = (state: ScenarioControllerState): ScenarioSnapshotPreview => ({
  snapshotAt: formatScenarioTimestamp(state.elapsedMs),
  systemMode: state.definition?.initialState.systemMode ?? SystemMode.AUTO_ADAPTIVE,
  lifecycle: state.lifecycle,
  direction: selectDirection(state),
  nodeCount: 3,
  onlineNodeCount: 3 - state.offlineNodeIds.length,
  lampCount: 5,
  activeLampCount: new Set(
    state.activeSensorIds
      .filter((sensorId) => sensorId.startsWith('sensor-ir-'))
      .map((sensorId) => sensorId.replace('sensor-ir-', 'lamp-')),
  ).size,
  sensorCount: 6,
  activeSensorCount: state.activeSensorIds.length,
  activeAlertCount: state.offlineNodeIds.length,
  source: DataSource.SIMULATED,
  quality: MetricQuality.GOOD,
});

export type ScenarioControlAvailability = Readonly<{
  canStart: boolean;
  canPause: boolean;
  canResume: boolean;
  canReset: boolean;
  canAdvance: boolean;
}>;

export const selectControlAvailability = (
  lifecycle: ScenarioLifecycle,
): ScenarioControlAvailability => ({
  canStart: lifecycle === 'READY',
  canPause: lifecycle === 'RUNNING',
  canResume: lifecycle === 'PAUSED',
  canReset: lifecycle !== 'IDLE' && lifecycle !== 'READY',
  canAdvance: lifecycle === 'RUNNING',
});
