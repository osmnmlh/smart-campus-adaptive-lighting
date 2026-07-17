import type {
  DataSource,
  Direction,
  MetricQuality,
  ScenarioDefinition,
  ScenarioEvent,
  SystemMode,
} from '@smart-campus/contracts';

export const SCENARIO_SPEEDS = [0.5, 1, 2, 5] as const;
export type ScenarioSpeed = (typeof SCENARIO_SPEEDS)[number];

export type ScenarioLifecycle = 'IDLE' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export type ScenarioId =
  'empty-campus' | 'left-to-right' | 'right-to-left' | 'center-presence' | 'node-offline';

export type PresentationEvent = Readonly<{
  id: string;
  atMs: number;
  type: string;
  label: string;
  detail: string;
}>;

export type ScenarioSnapshotPreview = Readonly<{
  snapshotAt: string;
  systemMode: SystemMode;
  lifecycle: ScenarioLifecycle;
  direction: Direction;
  nodeCount: number;
  onlineNodeCount: number;
  lampCount: number;
  activeLampCount: number;
  sensorCount: number;
  activeSensorCount: number;
  activeAlertCount: number;
  source: DataSource;
  quality: MetricQuality;
}>;

export type ScenarioControllerState = Readonly<{
  definition: ScenarioDefinition | null;
  selectedScenarioId: ScenarioId | null;
  lifecycle: ScenarioLifecycle;
  speed: ScenarioSpeed;
  elapsedMs: number;
  activeSensorIds: readonly string[];
  offlineNodeIds: readonly string[];
  processedEventCount: number;
  presentationSequence: number;
  recentEvents: readonly PresentationEvent[];
  errorMessage: string | null;
}>;

export type ScenarioControllerAction =
  | Readonly<{ type: 'SELECT_SCENARIO'; scenarioId: ScenarioId }>
  | Readonly<{ type: 'START' }>
  | Readonly<{ type: 'PAUSE' }>
  | Readonly<{ type: 'RESUME' }>
  | Readonly<{ type: 'RESET' }>
  | Readonly<{ type: 'STEP' }>
  | Readonly<{ type: 'ADVANCE' }>
  | Readonly<{ type: 'SET_SPEED'; speed: ScenarioSpeed }>;

export type ScenarioCatalogItem = Readonly<{
  id: ScenarioId;
  definition: ScenarioDefinition;
  eventCount: number;
}>;

export const isSensorEvent = (
  event: ScenarioEvent,
): event is Extract<ScenarioEvent, { type: 'SENSOR_ACTIVATED' | 'SENSOR_DEACTIVATED' }> =>
  event.type === 'SENSOR_ACTIVATED' || event.type === 'SENSOR_DEACTIVATED';
