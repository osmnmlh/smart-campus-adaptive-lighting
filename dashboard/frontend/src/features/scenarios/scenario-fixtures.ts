import {
  DayPhase,
  Direction,
  LampHealth,
  LampOperatingState,
  ScenarioDefinitionSchema,
  SystemMode,
  type Direction as DirectionValue,
  type LampOperatingState as LampOperatingStateValue,
  type ScenarioDefinition,
  type ScenarioEvent,
} from '@smart-campus/contracts';
import {
  SCENARIO_IDS,
  SCENARIO_LAMP_IDS,
  type ScenarioCatalogItem,
  type ScenarioId,
  type ScenarioLampId,
  type ScenarioLampState,
  type ScenarioPresentationEffect,
} from './scenario-model';

const BRIGHTNESS_BY_STATE: Readonly<Record<LampOperatingStateValue, number>> = {
  OFF: 0,
  STANDBY: 30,
  PRE_LIGHT: 60,
  ACTIVE: 100,
  FADING: 30,
};

const lampState = (
  lampId: ScenarioLampId,
  operatingState: LampOperatingStateValue,
): ScenarioLampState => {
  const brightnessPercent = BRIGHTNESS_BY_STATE[operatingState];
  return {
    lampId,
    operatingState,
    health: LampHealth.HEALTHY,
    brightnessPercent,
    targetBrightnessPercent: brightnessPercent,
    pwmDutyPercent: brightnessPercent,
  };
};

const lampStage = (
  input: {
    active?: readonly ScenarioLampId[];
    preLight?: readonly ScenarioLampId[];
    off?: readonly ScenarioLampId[];
  } = {},
): readonly ScenarioLampState[] =>
  SCENARIO_LAMP_IDS.map((lampId) => {
    if (input.off?.includes(lampId)) return lampState(lampId, LampOperatingState.OFF);
    if (input.active?.includes(lampId)) return lampState(lampId, LampOperatingState.ACTIVE);
    if (input.preLight?.includes(lampId)) return lampState(lampId, LampOperatingState.PRE_LIGHT);
    return lampState(lampId, LampOperatingState.STANDBY);
  });

export const createBaselineLampStates = (): readonly ScenarioLampState[] => lampStage();

const effect = (
  lamps: readonly ScenarioLampState[],
  direction?: DirectionValue,
): ScenarioPresentationEffect => (direction === undefined ? { lamps } : { lamps, direction });

const scenarioEvent = <T extends ScenarioEvent>(value: T): T => value;

const createDefinition = (input: {
  id: ScenarioId;
  name: string;
  description: string;
  durationMs: number;
  tags: string[];
  events: ScenarioEvent[];
}): ScenarioDefinition =>
  ScenarioDefinitionSchema.parse({
    ...input,
    tickMs: 1_000,
    initialState: {
      systemMode: SystemMode.AUTO_ADAPTIVE,
      dayPhase: DayPhase.NIGHT,
      lux: 5,
    },
    expectedOutcomes: [],
  });

const createCatalogItem = (
  definition: ScenarioDefinition,
  effects: readonly (ScenarioPresentationEffect | null)[],
): ScenarioCatalogItem => {
  if (effects.length !== definition.events.length) {
    throw new Error(`Presentation effect count mismatch for ${definition.id}`);
  }
  return {
    id: definition.id as ScenarioId,
    definition,
    eventCount: definition.events.length,
    simulated: true,
    effects,
  };
};

const emptyCampusDefinition = createDefinition({
  id: 'empty-campus',
  name: 'Empty Campus',
  description: 'Night-time standby state without motion or faults.',
  durationMs: 60_000,
  events: [],
  tags: ['empty', 'standby', 'deterministic', 'simulated'],
});

const leftToRightDefinition = createDefinition({
  id: 'left-to-right',
  name: 'Left to Right',
  description: 'IR1 through IR5 presents deterministic left-to-right lamp progression.',
  durationMs: 50_000,
  events: [
    scenarioEvent({
      atMs: 1_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR1 entry',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 2_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR1 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 2_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR2 confirms direction',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 3_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR2 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 3_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR3 center progression',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 4_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR3 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 4_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR4 progression',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 5_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR4 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 5_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR5 exit',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 6_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR5 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
      payload: {},
    }),
  ],
  tags: ['motion', 'left-to-right', 'lamp-progression', 'simulated'],
});

const rightToLeftDefinition = createDefinition({
  id: 'right-to-left',
  name: 'Right to Left',
  description: 'IR5 through IR1 presents deterministic right-to-left lamp progression.',
  durationMs: 50_000,
  events: [
    scenarioEvent({
      atMs: 1_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR5 entry',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 2_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR5 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 2_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR4 confirms direction',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 3_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR4 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 3_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR3 center progression',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 4_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR3 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 4_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR2 progression',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 5_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR2 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 5_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR1 exit',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 6_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR1 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
      payload: {},
    }),
  ],
  tags: ['motion', 'right-to-left', 'lamp-progression', 'simulated'],
});

const centerPresenceDefinition = createDefinition({
  id: 'center-presence',
  name: 'Center Presence',
  description: 'IR3 presents center presence without inferring a direction.',
  durationMs: 10_000,
  events: [
    scenarioEvent({
      atMs: 1_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR3 center presence',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    }),
    scenarioEvent({
      atMs: 3_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR3 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    }),
  ],
  tags: ['motion', 'center', 'directionless', 'simulated'],
});

const nodeOfflineDefinition = createDefinition({
  id: 'node-offline',
  name: 'Node Offline',
  description: 'NODE_2 loses communication and raises one deterministic alert.',
  durationMs: 5_000,
  events: [
    scenarioEvent({
      atMs: 1_000,
      type: 'SET_NODE_ONLINE',
      label: 'NODE_2 goes offline',
      target: { entityType: 'NODE', entityId: 'node-2' },
      payload: { online: false },
    }),
    scenarioEvent({
      atMs: 2_000,
      type: 'SET_NODE_ONLINE',
      label: 'NODE_2 remains offline',
      target: { entityType: 'NODE', entityId: 'node-2' },
      payload: { online: false },
    }),
  ],
  tags: ['fault', 'node-offline', 'alert', 'simulated'],
});

export const scenarioCatalog: readonly ScenarioCatalogItem[] = [
  createCatalogItem(emptyCampusDefinition, []),
  createCatalogItem(leftToRightDefinition, [
    effect(lampStage({ active: ['lamp-1'], preLight: ['lamp-2'] })),
    null,
    effect(
      lampStage({ active: ['lamp-2'], preLight: ['lamp-1', 'lamp-3'] }),
      Direction.LEFT_TO_RIGHT,
    ),
    null,
    effect(lampStage({ active: ['lamp-3'], preLight: ['lamp-2', 'lamp-4'] })),
    null,
    effect(lampStage({ active: ['lamp-4'], preLight: ['lamp-3', 'lamp-5'] })),
    null,
    effect(lampStage({ active: ['lamp-5'], preLight: ['lamp-4'] })),
    effect(createBaselineLampStates()),
  ]),
  createCatalogItem(rightToLeftDefinition, [
    effect(lampStage({ active: ['lamp-5'], preLight: ['lamp-4'] })),
    null,
    effect(
      lampStage({ active: ['lamp-4'], preLight: ['lamp-3', 'lamp-5'] }),
      Direction.RIGHT_TO_LEFT,
    ),
    null,
    effect(lampStage({ active: ['lamp-3'], preLight: ['lamp-2', 'lamp-4'] })),
    null,
    effect(lampStage({ active: ['lamp-2'], preLight: ['lamp-1', 'lamp-3'] })),
    null,
    effect(lampStage({ active: ['lamp-1'], preLight: ['lamp-2'] })),
    effect(createBaselineLampStates()),
  ]),
  createCatalogItem(centerPresenceDefinition, [
    effect(lampStage({ active: ['lamp-3'], preLight: ['lamp-2', 'lamp-4'] }), Direction.NONE),
    effect(createBaselineLampStates(), Direction.NONE),
  ]),
  createCatalogItem(nodeOfflineDefinition, [
    effect(lampStage({ off: ['lamp-3'] }), Direction.NONE),
    null,
  ]),
];

export const isScenarioId = (value: unknown): value is ScenarioId =>
  typeof value === 'string' && (SCENARIO_IDS as readonly string[]).includes(value);

export function getScenarioCatalogItem(id: ScenarioId): ScenarioCatalogItem {
  const item = scenarioCatalog.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`Unknown local scenario: ${id}`);
  return item;
}

export function getScenarioDefinition(id: ScenarioId): ScenarioDefinition {
  return getScenarioCatalogItem(id).definition;
}
