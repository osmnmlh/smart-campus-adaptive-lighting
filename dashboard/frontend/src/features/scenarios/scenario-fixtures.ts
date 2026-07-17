import {
  DayPhase,
  ScenarioDefinitionSchema,
  SystemMode,
  type ScenarioDefinition,
  type ScenarioEvent,
} from '@smart-campus/contracts';
import type { ScenarioCatalogItem, ScenarioId } from './scenario-model';

const event = <T extends ScenarioEvent>(value: T): T => value;

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

const definitions = [
  createDefinition({
    id: 'empty-campus',
    name: 'Empty Campus',
    description: 'Night-time standby state without motion or faults.',
    durationMs: 60_000,
    events: [],
    tags: ['empty', 'standby', 'deterministic'],
  }),
  createDefinition({
    id: 'left-to-right',
    name: 'Left to Right',
    description: 'IR1 followed by IR2 confirms left-to-right presence.',
    durationMs: 50_000,
    events: [
      event({
        atMs: 1_000,
        type: 'SENSOR_ACTIVATED',
        label: 'IR1 entry',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
        payload: {},
      }),
      event({
        atMs: 2_000,
        type: 'SENSOR_ACTIVATED',
        label: 'IR2 confirms direction',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
        payload: {},
      }),
      event({
        atMs: 5_000,
        type: 'SENSOR_DEACTIVATED',
        label: 'IR1 clears',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
        payload: {},
      }),
      event({
        atMs: 6_000,
        type: 'SENSOR_DEACTIVATED',
        label: 'IR2 clears',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
        payload: {},
      }),
    ],
    tags: ['motion', 'left-to-right', 'hold', 'fade'],
  }),
  createDefinition({
    id: 'right-to-left',
    name: 'Right to Left',
    description: 'IR5 followed by IR4 confirms right-to-left presence.',
    durationMs: 50_000,
    events: [
      event({
        atMs: 1_000,
        type: 'SENSOR_ACTIVATED',
        label: 'IR5 entry',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
        payload: {},
      }),
      event({
        atMs: 2_000,
        type: 'SENSOR_ACTIVATED',
        label: 'IR4 confirms direction',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
        payload: {},
      }),
      event({
        atMs: 5_000,
        type: 'SENSOR_DEACTIVATED',
        label: 'IR5 clears',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
        payload: {},
      }),
      event({
        atMs: 6_000,
        type: 'SENSOR_DEACTIVATED',
        label: 'IR4 clears',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
        payload: {},
      }),
    ],
    tags: ['motion', 'right-to-left', 'hold', 'fade'],
  }),
  createDefinition({
    id: 'center-presence',
    name: 'Center Presence',
    description: 'IR3 confirms center presence without inferring a direction.',
    durationMs: 10_000,
    events: [
      event({
        atMs: 1_000,
        type: 'SENSOR_ACTIVATED',
        label: 'IR3 center presence',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
        payload: {},
      }),
      event({
        atMs: 3_000,
        type: 'SENSOR_DEACTIVATED',
        label: 'IR3 clears',
        target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
        payload: {},
      }),
    ],
    tags: ['motion', 'center', 'directionless'],
  }),
  createDefinition({
    id: 'node-offline',
    name: 'Node Offline',
    description: 'NODE_2 loses communication and raises one deterministic alert.',
    durationMs: 5_000,
    events: [
      event({
        atMs: 1_000,
        type: 'SET_NODE_ONLINE',
        label: 'NODE_2 goes offline',
        target: { entityType: 'NODE', entityId: 'node-2' },
        payload: { online: false },
      }),
      event({
        atMs: 2_000,
        type: 'SET_NODE_ONLINE',
        label: 'NODE_2 remains offline',
        target: { entityType: 'NODE', entityId: 'node-2' },
        payload: { online: false },
      }),
    ],
    tags: ['fault', 'node-offline', 'alert'],
  }),
] as const;

export const scenarioCatalog: readonly ScenarioCatalogItem[] = definitions.map((definition) => ({
  id: definition.id as ScenarioId,
  definition,
  eventCount: definition.events.length,
}));

export const DEFAULT_SCENARIO_ID: ScenarioId = 'empty-campus';

export function getScenarioDefinition(id: ScenarioId): ScenarioDefinition {
  const item = scenarioCatalog.find((candidate) => candidate.id === id);
  if (item === undefined) throw new Error(`Unknown local scenario: ${id}`);
  return item.definition;
}
