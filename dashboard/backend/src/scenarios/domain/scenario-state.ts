import {
  CommunicationHealth,
  DataSource,
  DayPhase,
  Direction,
  LampHealth,
  LampOperatingState,
  MetricQuality,
  NodeHealth,
  SensorHealth,
  SystemMode,
  type Alert,
  type DirectionState,
  type EventLog,
  type LampSnapshot,
  type NodeSnapshot,
  type ScenarioDefinition,
  type SensorId,
  type SensorSnapshot,
  type SystemSnapshot,
} from '@smart-campus/contracts';

import { BRIGHTNESS_LEVELS, type CanonicalLampId, standbyLevels } from './brightness-policy.js';
import { createDirectionDetectorState, type DirectionDetectorState } from './direction-detector.js';

export const CANONICAL_NODE_IDS = ['node-1', 'node-2', 'node-3'] as const;
export const CANONICAL_SENSOR_IDS = [
  'sensor-ir-1',
  'sensor-ir-2',
  'sensor-ir-3',
  'sensor-ir-4',
  'sensor-ir-5',
  'sensor-bh1750-1',
] as const;

export const NODE_LAMP_OWNERSHIP = Object.freeze({
  'node-1': ['lamp-1', 'lamp-2'],
  'node-2': ['lamp-3'],
  'node-3': ['lamp-4', 'lamp-5'],
} satisfies Record<(typeof CANONICAL_NODE_IDS)[number], CanonicalLampId[]>);

export const SENSOR_LAMP_OWNERSHIP = Object.freeze({
  'sensor-ir-1': 'lamp-1',
  'sensor-ir-2': 'lamp-2',
  'sensor-ir-3': 'lamp-3',
  'sensor-ir-4': 'lamp-4',
  'sensor-ir-5': 'lamp-5',
} satisfies Record<
  'sensor-ir-1' | 'sensor-ir-2' | 'sensor-ir-3' | 'sensor-ir-4' | 'sensor-ir-5',
  CanonicalLampId
>);

export interface PresenceState {
  activeSensorIds: SensorId[];
  inactiveSinceMs: number | null;
  lastPresenceLevels: Record<CanonicalLampId, number>;
}

/** Internal execution state kept separate from the transport SystemSnapshot contract. */
export interface ScenarioState {
  scenarioId: string;
  systemMode: SystemSnapshot['systemMode'];
  dayPhase: SystemSnapshot['dayPhase'];
  lux: SystemSnapshot['lux'];
  direction: DirectionState;
  nodes: NodeSnapshot[];
  lamps: LampSnapshot[];
  sensors: SensorSnapshot[];
  activeAlerts: Alert[];
  recentEvents: EventLog[];
  instantPower: SystemSnapshot['instantPower'];
  energyConsumed: SystemSnapshot['energyConsumed'];
  baselineEnergy: SystemSnapshot['baselineEnergy'];
  estimatedSavingPercent: SystemSnapshot['estimatedSavingPercent'];
  presence: PresenceState;
  directionDetector: DirectionDetectorState;
  eventSequence: number;
}

const simulatedMetric = <T>(value: T, unit: string, observedAt: string) => ({
  value,
  unit,
  source: DataSource.SIMULATED,
  observedAt,
  quality: MetricQuality.GOOD,
});

const createNode = (nodeId: string, snapshotAt: string): NodeSnapshot => ({
  nodeId,
  health: NodeHealth.HEALTHY,
  online: true,
  uptimeMs: 0,
  communication: {
    health: CommunicationHealth.HEALTHY,
    lastHeartbeatAt: snapshotAt,
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    packetLossPercent: 0,
    averageLatencyMs: 0,
  },
  holdRemainingMs: 0,
});

const createLamp = (lampId: CanonicalLampId, snapshotAt: string): LampSnapshot => ({
  lampId,
  operatingState: LampOperatingState.STANDBY,
  health: LampHealth.HEALTHY,
  brightnessPercent: BRIGHTNESS_LEVELS.STANDBY,
  targetBrightnessPercent: BRIGHTNESS_LEVELS.STANDBY,
  pwmDutyPercent: BRIGHTNESS_LEVELS.STANDBY,
  electrical: {
    current: null,
    voltage: null,
    power: null,
    energy: { ...simulatedMetric(0, 'Wh', snapshotAt), unit: 'Wh' },
  },
  fadeRemainingMs: 0,
  updatedAt: snapshotAt,
});

const createSensor = (sensorId: SensorId, snapshotAt: string): SensorSnapshot => {
  if (sensorId === 'sensor-bh1750-1') {
    return {
      sensorId,
      health: SensorHealth.HEALTHY,
      reading: { ...simulatedMetric(5, 'LX', snapshotAt), unit: 'LX' },
      lastChangedAt: snapshotAt,
    };
  }

  return {
    sensorId,
    health: SensorHealth.HEALTHY,
    active: false,
    lastChangedAt: snapshotAt,
  };
};

export const createInitialScenarioState = (
  definition: ScenarioDefinition,
  snapshotAt: string,
): ScenarioState => {
  const state: ScenarioState = {
    scenarioId: definition.id,
    systemMode: definition.initialState.systemMode ?? SystemMode.AUTO_ADAPTIVE,
    dayPhase: definition.initialState.dayPhase ?? DayPhase.NIGHT,
    lux: {
      ...simulatedMetric(definition.initialState.lux ?? 5, 'LX', snapshotAt),
      unit: 'LX',
    },
    direction: {
      direction: Direction.UNKNOWN,
      confidence: 0,
      confirmedBySensorIds: [],
      updatedAt: snapshotAt,
      source: DataSource.SIMULATED,
    },
    nodes: CANONICAL_NODE_IDS.map((nodeId) => createNode(nodeId, snapshotAt)),
    lamps: (['lamp-1', 'lamp-2', 'lamp-3', 'lamp-4', 'lamp-5'] as const).map((lampId) =>
      createLamp(lampId, snapshotAt),
    ),
    sensors: CANONICAL_SENSOR_IDS.map((sensorId) => createSensor(sensorId, snapshotAt)),
    activeAlerts: [],
    recentEvents: [],
    instantPower: { ...simulatedMetric(0, 'W', snapshotAt), unit: 'W' },
    energyConsumed: { ...simulatedMetric(0, 'Wh', snapshotAt), unit: 'Wh' },
    baselineEnergy: { ...simulatedMetric(0, 'Wh', snapshotAt), unit: 'Wh' },
    estimatedSavingPercent: null,
    presence: {
      activeSensorIds: [],
      inactiveSinceMs: null,
      lastPresenceLevels: standbyLevels(),
    },
    directionDetector: createDirectionDetectorState(),
    eventSequence: 0,
  };

  definition.initialState.nodes?.forEach((initialNode) => {
    const node = state.nodes.find((candidate) => candidate.nodeId === initialNode.nodeId);
    if (node !== undefined) {
      node.online = initialNode.online;
      node.health =
        initialNode.health ?? (initialNode.online ? NodeHealth.HEALTHY : NodeHealth.OFFLINE);
      node.communication.health = initialNode.online
        ? CommunicationHealth.HEALTHY
        : CommunicationHealth.LOST;
      node.communication.lastHeartbeatAt = initialNode.online ? snapshotAt : null;
    }
  });

  definition.initialState.lamps?.forEach((initialLamp) => {
    const lamp = state.lamps.find((candidate) => candidate.lampId === initialLamp.lampId);
    if (lamp !== undefined) {
      lamp.brightnessPercent = initialLamp.brightnessPercent;
      lamp.targetBrightnessPercent = initialLamp.brightnessPercent;
      lamp.pwmDutyPercent = initialLamp.brightnessPercent;
      lamp.operatingState = initialLamp.operatingState ?? LampOperatingState.STANDBY;
      lamp.health = initialLamp.health ?? LampHealth.HEALTHY;
    }
  });

  definition.initialState.sensors?.forEach((initialSensor) => {
    const sensor = state.sensors.find((candidate) => candidate.sensorId === initialSensor.sensorId);
    if (sensor !== undefined) {
      sensor.health = initialSensor.health ?? SensorHealth.HEALTHY;
      if (sensor.sensorId !== 'sensor-bh1750-1') {
        sensor.active = initialSensor.active ?? false;
      }
    }
  });

  return state;
};

export const cloneScenarioState = (state: ScenarioState): ScenarioState =>
  JSON.parse(JSON.stringify(state)) as ScenarioState;
