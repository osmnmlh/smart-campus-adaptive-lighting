import { Direction, LampOperatingState } from '@smart-campus/contracts';
import type {
  Direction as DirectionValue,
  LampHealth,
  LampOperatingState as LampOperatingStateValue,
} from '@smart-campus/contracts';
import type { ScenarioControllerState, ScenarioLampId, ScenarioLampState } from './scenario-model';

export const SCENARIO_STAGE_LAMPS = [
  { lampId: 'lamp-1', id: 'L1', nodeId: 'NODE_1', sensorId: 'IR1', x: 110 },
  { lampId: 'lamp-2', id: 'L2', nodeId: 'NODE_1', sensorId: 'IR2', x: 270 },
  { lampId: 'lamp-3', id: 'L3', nodeId: 'NODE_2', sensorId: 'IR3', x: 450 },
  { lampId: 'lamp-4', id: 'L4', nodeId: 'NODE_3', sensorId: 'IR4', x: 630 },
  { lampId: 'lamp-5', id: 'L5', nodeId: 'NODE_3', sensorId: 'IR5', x: 790 },
] as const;

export type ScenarioStageLampId = (typeof SCENARIO_STAGE_LAMPS)[number]['id'];
export type ScenarioStageNodeId = (typeof SCENARIO_STAGE_LAMPS)[number]['nodeId'];

export type ScenarioStageLamp = Readonly<{
  id: ScenarioStageLampId;
  contractId: ScenarioLampId;
  nodeId: ScenarioStageNodeId;
  x: number;
  operatingState: LampOperatingStateValue;
  health: LampHealth;
  brightnessPercent: number;
  targetBrightnessPercent: number;
  pwmDutyPercent: number;
  haloRadius: number;
  haloOpacity: number;
}>;

export type ScenarioStageSensor = Readonly<{
  id: `IR${1 | 2 | 3 | 4 | 5}`;
  contractId: `sensor-ir-${1 | 2 | 3 | 4 | 5}`;
  lampId: ScenarioStageLampId;
  x: number;
  active: boolean;
}>;

export type ScenarioStageNode = Readonly<{
  id: ScenarioStageNodeId;
  contractId: `node-${1 | 2 | 3}`;
  lampIds: readonly ScenarioStageLampId[];
  x: number;
  width: number;
  offline: boolean;
}>;

export type ScenarioStageDirection = Readonly<{
  value: DirectionValue;
  label: string;
  arrow: 'left' | 'right' | null;
}>;

export type ScenarioStageViewModel = Readonly<{
  scenarioName: string;
  lifecycle: ScenarioControllerState['lifecycle'];
  lamps: readonly ScenarioStageLamp[];
  sensors: readonly ScenarioStageSensor[];
  ambientSensor: Readonly<{
    id: 'BH1750';
    contractId: 'sensor-bh1750-1';
    active: boolean;
    description: 'Ambient light sensor';
  }>;
  nodes: readonly ScenarioStageNode[];
  direction: ScenarioStageDirection;
  motionLampId: ScenarioStageLampId | null;
  motionLabel: string;
  summary: string;
}>;

const directionPresentation = (direction: DirectionValue): ScenarioStageDirection => {
  if (direction === Direction.LEFT_TO_RIGHT) {
    return { value: direction, label: 'Left to right', arrow: 'right' };
  }
  if (direction === Direction.RIGHT_TO_LEFT) {
    return { value: direction, label: 'Right to left', arrow: 'left' };
  }
  if (direction === Direction.NONE) {
    return { value: direction, label: 'No direction', arrow: null };
  }
  return { value: direction, label: 'Direction unknown', arrow: null };
};

const safeBrightness = (value: number): number =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

const lampVisual = (
  config: (typeof SCENARIO_STAGE_LAMPS)[number],
  lamp: ScenarioLampState,
): ScenarioStageLamp => {
  const brightnessPercent = safeBrightness(lamp.brightnessPercent);
  return {
    id: config.id,
    contractId: config.lampId,
    nodeId: config.nodeId,
    x: config.x,
    operatingState: lamp.operatingState,
    health: lamp.health,
    brightnessPercent,
    targetBrightnessPercent: safeBrightness(lamp.targetBrightnessPercent),
    pwmDutyPercent: safeBrightness(lamp.pwmDutyPercent),
    haloRadius: brightnessPercent === 0 ? 16 : 18 + brightnessPercent * 0.32,
    haloOpacity: brightnessPercent === 0 ? 0 : 0.12 + brightnessPercent * 0.004,
  };
};

const selectMotionLampId = (
  sensors: readonly ScenarioStageSensor[],
  lamps: readonly ScenarioStageLamp[],
): ScenarioStageLampId | null => {
  const activeSensors = sensors.filter((sensor) => sensor.active);
  if (activeSensors.length === 1) return activeSensors.at(0)?.lampId ?? null;
  if (activeSensors.length < 2) return null;

  const activeLampIds = new Set(
    lamps
      .filter((lamp) => lamp.operatingState === LampOperatingState.ACTIVE)
      .map((lamp) => lamp.id),
  );
  const exactMatches = activeSensors.filter((sensor) => activeLampIds.has(sensor.lampId));
  return exactMatches.length === 1 ? (exactMatches.at(0)?.lampId ?? null) : null;
};

const nodeIsOffline = (nodeId: ScenarioStageNodeId, offlineNodeIds: readonly string[]): boolean =>
  offlineNodeIds.includes(nodeId.toLowerCase().replace('_', '-'));

export function selectScenarioStageViewModel(
  state: ScenarioControllerState,
): ScenarioStageViewModel {
  const lampById = new Map(state.lamps.map((lamp) => [lamp.lampId, lamp]));
  const lamps = SCENARIO_STAGE_LAMPS.map((config) => {
    const lamp = lampById.get(config.lampId);
    if (lamp === undefined) throw new Error(`Missing scenario lamp state: ${config.lampId}`);
    return lampVisual(config, lamp);
  });
  const sensors = SCENARIO_STAGE_LAMPS.map((config, index): ScenarioStageSensor => ({
    id: config.sensorId,
    contractId: `sensor-ir-${index + 1}` as ScenarioStageSensor['contractId'],
    lampId: config.id,
    x: config.x,
    active: state.activeSensorIds.includes(`sensor-ir-${index + 1}`),
  }));
  const nodes: readonly ScenarioStageNode[] = [
    {
      id: 'NODE_1',
      contractId: 'node-1',
      lampIds: ['L1', 'L2'],
      x: 50,
      width: 280,
      offline: nodeIsOffline('NODE_1', state.offlineNodeIds),
    },
    {
      id: 'NODE_2',
      contractId: 'node-2',
      lampIds: ['L3'],
      x: 370,
      width: 160,
      offline: nodeIsOffline('NODE_2', state.offlineNodeIds),
    },
    {
      id: 'NODE_3',
      contractId: 'node-3',
      lampIds: ['L4', 'L5'],
      x: 570,
      width: 280,
      offline: nodeIsOffline('NODE_3', state.offlineNodeIds),
    },
  ];
  const direction = directionPresentation(state.direction);
  const motionLampId = selectMotionLampId(sensors, lamps);
  const motionLabel =
    motionLampId === null ? 'Motion position unavailable' : `Motion detected near ${motionLampId}`;
  const offlineLabels = nodes.filter((node) => node.offline).map((node) => node.id);
  const scenarioName = state.definition?.name ?? 'No scenario selected';
  const summary = [
    `${scenarioName}; ${state.lifecycle.toLowerCase()} simulated presentation.`,
    'Five lamps ordered L1 through L5 along the campus road.',
    motionLabel + '.',
    `Direction: ${direction.label}.`,
    offlineLabels.length === 0
      ? 'All node communication groups shown online.'
      : `Offline communication groups: ${offlineLabels.join(', ')}.`,
  ].join(' ');

  return {
    scenarioName,
    lifecycle: state.lifecycle,
    lamps,
    sensors,
    ambientSensor: {
      id: 'BH1750',
      contractId: 'sensor-bh1750-1',
      active: state.activeSensorIds.includes('sensor-bh1750-1'),
      description: 'Ambient light sensor',
    },
    nodes,
    direction,
    motionLampId,
    motionLabel,
    summary,
  };
}
