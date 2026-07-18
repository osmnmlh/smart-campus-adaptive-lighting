import type {
  DataSource,
  Direction,
  LampHealth,
  LampOperatingState,
  MetricQuality,
  ScenarioDefinition,
  ScenarioEvent,
  SystemMode,
} from '@smart-campus/contracts';

export const SCENARIO_SPEEDS = [0.5, 1, 2, 5] as const;
export type ScenarioSpeed = (typeof SCENARIO_SPEEDS)[number];

export const SCENARIO_IDS = [
  'empty-campus',
  'left-to-right',
  'right-to-left',
  'center-presence',
  'node-offline',
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const SCENARIO_LAMP_IDS = ['lamp-1', 'lamp-2', 'lamp-3', 'lamp-4', 'lamp-5'] as const;
export type ScenarioLampId = (typeof SCENARIO_LAMP_IDS)[number];

export type ScenarioLifecycle = 'IDLE' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ERROR';

export type ScenarioActionType =
  'SELECT_SCENARIO' | 'START' | 'PAUSE' | 'RESUME' | 'RESET' | 'STEP' | 'ADVANCE' | 'SET_SPEED';

export type ScenarioTransitionErrorCode =
  | 'INVALID_TRANSITION'
  | 'INVALID_SPEED'
  | 'INVALID_DELTA'
  | 'UNKNOWN_SCENARIO'
  | 'SCENARIO_LOAD_FAILED';

export type ScenarioTransitionError = Readonly<{
  code: ScenarioTransitionErrorCode;
  action: ScenarioActionType;
  lifecycle: ScenarioLifecycle;
  message: string;
}>;

export type ScenarioLampState = Readonly<{
  lampId: ScenarioLampId;
  operatingState: LampOperatingState;
  health: LampHealth;
  brightnessPercent: number;
  targetBrightnessPercent: number;
  pwmDutyPercent: number;
}>;

export type ScenarioPresentationEffect = Readonly<{
  lamps?: readonly ScenarioLampState[];
  direction?: Direction;
}>;

export type PresentationEvent = Readonly<{
  id: string;
  atMs: number;
  type: string;
  label: string;
  detail: string;
}>;

export type ScenarioSnapshotPreview = Readonly<{
  virtualTimestamp: string;
  systemMode: SystemMode;
  lifecycle: ScenarioLifecycle;
  direction: Direction;
  totalNodeCount: number;
  activeNodeCount: number;
  totalLampCount: number;
  activeLampCount: number;
  preLightLampCount: number;
  standbyLampCount: number;
  offLampCount: number;
  totalSensorCount: number;
  activeSensorCount: number;
  activeSensorIds: readonly string[];
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
  direction: Direction;
  lamps: readonly ScenarioLampState[];
  activeSensorIds: readonly string[];
  offlineNodeIds: readonly string[];
  processedEventCount: number;
  presentationSequence: number;
  recentEvents: readonly PresentationEvent[];
  lastError: ScenarioTransitionError | null;
}>;

export type ScenarioControllerAction =
  | Readonly<{ type: 'SELECT_SCENARIO'; scenarioId: unknown }>
  | Readonly<{ type: 'START' }>
  | Readonly<{ type: 'PAUSE' }>
  | Readonly<{ type: 'RESUME' }>
  | Readonly<{ type: 'RESET' }>
  | Readonly<{ type: 'STEP' }>
  | Readonly<{ type: 'ADVANCE' }>
  | Readonly<{ type: 'SET_SPEED'; speed: unknown }>;

export type ScenarioCatalogItem = Readonly<{
  id: ScenarioId;
  definition: ScenarioDefinition;
  eventCount: number;
  simulated: true;
  effects: readonly (ScenarioPresentationEffect | null)[];
}>;

export const isSensorEvent = (
  event: ScenarioEvent,
): event is Extract<ScenarioEvent, { type: 'SENSOR_ACTIVATED' | 'SENSOR_DEACTIVATED' }> =>
  event.type === 'SENSOR_ACTIVATED' || event.type === 'SENSOR_DEACTIVATED';
