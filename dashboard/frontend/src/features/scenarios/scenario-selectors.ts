import {
  DataSource,
  LampOperatingState,
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
  return Math.min(100, Math.max(0, (state.elapsedMs / durationMs) * 100));
};

export const selectRemainingEventCount = (state: ScenarioControllerState): number =>
  Math.max(0, (state.definition?.events.length ?? 0) - state.processedEventCount);

export const selectUpcomingEvents = (
  state: ScenarioControllerState,
  limit = 3,
): readonly ScenarioEvent[] =>
  state.definition?.events.slice(state.processedEventCount, state.processedEventCount + limit) ??
  [];

export const selectSnapshotPreview = (
  state: ScenarioControllerState,
): ScenarioSnapshotPreview | null => {
  if (state.definition === null || state.selectedScenarioId === null) return null;

  return {
    virtualTimestamp: formatScenarioTimestamp(state.elapsedMs),
    systemMode: state.definition.initialState.systemMode ?? SystemMode.AUTO_ADAPTIVE,
    lifecycle: state.lifecycle,
    direction: state.direction,
    totalNodeCount: 3,
    activeNodeCount: 3 - state.offlineNodeIds.length,
    totalLampCount: state.lamps.length,
    activeLampCount: state.lamps.filter((lamp) => lamp.operatingState === LampOperatingState.ACTIVE)
      .length,
    preLightLampCount: state.lamps.filter(
      (lamp) => lamp.operatingState === LampOperatingState.PRE_LIGHT,
    ).length,
    standbyLampCount: state.lamps.filter(
      (lamp) => lamp.operatingState === LampOperatingState.STANDBY,
    ).length,
    offLampCount: state.lamps.filter((lamp) => lamp.operatingState === LampOperatingState.OFF)
      .length,
    totalSensorCount: 6,
    activeSensorCount: state.activeSensorIds.length,
    activeSensorIds: [...state.activeSensorIds],
    activeAlertCount: state.offlineNodeIds.length,
    source: DataSource.SIMULATED,
    quality: MetricQuality.GOOD,
  };
};

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
