import { ScenarioDefinitionSchema } from '@smart-campus/contracts';
import {
  createBaselineLampStates,
  getScenarioCatalogItem,
  getScenarioDefinition,
  isScenarioId,
  scenarioCatalog,
} from '@/features/scenarios/scenario-fixtures';

describe('scenario fixtures', () => {
  it('publishes exactly the five required deterministic scenarios', () => {
    expect(scenarioCatalog).toHaveLength(5);
    expect(scenarioCatalog.map((item) => item.id)).toEqual([
      'empty-campus',
      'left-to-right',
      'right-to-left',
      'center-presence',
      'node-offline',
    ]);
    expect(new Set(scenarioCatalog.map((item) => item.id)).size).toBe(5);
    expect(scenarioCatalog.map((item) => item.definition.name)).toEqual([
      'Empty Campus',
      'Left to Right',
      'Right to Left',
      'Center Presence',
      'Node Offline',
    ]);
    expect(scenarioCatalog.every((item) => item.simulated)).toBe(true);
  });

  it.each(scenarioCatalog)('validates $id and its effects through stable contracts', (item) => {
    const result = ScenarioDefinitionSchema.safeParse(item.definition);
    expect(result.success).toBe(true);
    expect(item.definition.id).toBe(item.id);
    expect(item.definition.tickMs).toBe(1_000);
    expect(item.definition.durationMs).toBeGreaterThan(0);
    expect(item.definition.initialState.systemMode).toBe('AUTO_ADAPTIVE');
    expect(item.definition.initialState.dayPhase).toBe('NIGHT');
    expect(item.definition.initialState.lux).toBe(5);
    expect(item.definition.expectedOutcomes).toEqual([]);
    expect(item.eventCount).toBe(item.definition.events.length);
    expect(item.effects).toHaveLength(item.definition.events.length);
    expect(item.definition.tags).toContain('simulated');
    expect(item.definition.events.every((event) => event.atMs <= item.definition.durationMs)).toBe(
      true,
    );
  });

  it('defines explicit left-to-right sensor and lamp progression', () => {
    const item = getScenarioCatalogItem('left-to-right');
    const activations = item.definition.events.filter((event) => event.type === 'SENSOR_ACTIVATED');
    expect(item.definition.durationMs).toBe(50_000);
    expect(item.definition.events).toHaveLength(10);
    expect(activations.map((event) => event.target.entityId)).toEqual([
      'sensor-ir-1',
      'sensor-ir-2',
      'sensor-ir-3',
      'sensor-ir-4',
      'sensor-ir-5',
    ]);
    expect(item.effects[0]?.lamps?.find((lamp) => lamp.lampId === 'lamp-1')?.operatingState).toBe(
      'ACTIVE',
    );
    expect(item.effects[0]?.lamps?.find((lamp) => lamp.lampId === 'lamp-2')?.operatingState).toBe(
      'PRE_LIGHT',
    );
    expect(item.effects[2]?.direction).toBe('LEFT_TO_RIGHT');
    expect(
      item.effects[4]?.lamps?.find((lamp) => lamp.lampId === 'lamp-3')?.brightnessPercent,
    ).toBe(100);
    expect(item.effects[8]?.lamps?.find((lamp) => lamp.lampId === 'lamp-5')?.pwmDutyPercent).toBe(
      100,
    );
    expect(item.effects[9]?.lamps?.every((lamp) => lamp.operatingState === 'STANDBY')).toBe(true);
  });

  it('defines explicit right-to-left sensor and lamp progression', () => {
    const item = getScenarioCatalogItem('right-to-left');
    const activations = item.definition.events.filter((event) => event.type === 'SENSOR_ACTIVATED');
    expect(item.definition.events).toHaveLength(10);
    expect(activations.map((event) => event.target.entityId)).toEqual([
      'sensor-ir-5',
      'sensor-ir-4',
      'sensor-ir-3',
      'sensor-ir-2',
      'sensor-ir-1',
    ]);
    expect(item.effects[0]?.lamps?.find((lamp) => lamp.lampId === 'lamp-5')?.operatingState).toBe(
      'ACTIVE',
    );
    expect(item.effects[0]?.lamps?.find((lamp) => lamp.lampId === 'lamp-4')?.operatingState).toBe(
      'PRE_LIGHT',
    );
    expect(item.effects[2]?.direction).toBe('RIGHT_TO_LEFT');
    expect(item.effects[6]?.lamps?.find((lamp) => lamp.lampId === 'lamp-2')?.operatingState).toBe(
      'ACTIVE',
    );
    expect(item.effects[8]?.lamps?.find((lamp) => lamp.lampId === 'lamp-1')?.operatingState).toBe(
      'ACTIVE',
    );
  });

  it('keeps center, node-offline, and empty semantics explicit', () => {
    const empty = getScenarioCatalogItem('empty-campus');
    const center = getScenarioCatalogItem('center-presence');
    const offline = getScenarioCatalogItem('node-offline');
    expect(empty.definition.events).toEqual([]);
    expect(empty.effects).toEqual([]);
    expect(center.definition.events[0]?.target?.entityId).toBe('sensor-ir-3');
    expect(center.effects[0]?.direction).toBe('NONE');
    expect(center.effects[0]?.lamps?.find((lamp) => lamp.lampId === 'lamp-3')?.operatingState).toBe(
      'ACTIVE',
    );
    expect(offline.definition.events).toHaveLength(2);
    expect(offline.definition.events[0]?.target?.entityId).toBe('node-2');
    expect(
      offline.effects[0]?.lamps?.find((lamp) => lamp.lampId === 'lamp-3')?.operatingState,
    ).toBe('OFF');
    expect(getScenarioDefinition('empty-campus').tags).toContain('standby');
  });

  it('creates a fresh canonical five-lamp baseline', () => {
    const first = createBaselineLampStates();
    const second = createBaselineLampStates();
    expect(first).toHaveLength(5);
    expect(first.map((lamp) => lamp.lampId)).toEqual([
      'lamp-1',
      'lamp-2',
      'lamp-3',
      'lamp-4',
      'lamp-5',
    ]);
    expect(first.every((lamp) => lamp.operatingState === 'STANDBY')).toBe(true);
    expect(first.every((lamp) => lamp.brightnessPercent === 30)).toBe(true);
    expect(first.every((lamp) => lamp.targetBrightnessPercent === 30)).toBe(true);
    expect(first.every((lamp) => lamp.pwmDutyPercent === 30)).toBe(true);
    expect(first).not.toBe(second);
  });

  it.each([
    ['empty-campus', true],
    ['node-offline', true],
    ['unknown', false],
    [null, false],
    [3, false],
  ])('validates scenario ID %j as %s', (value, expected) => {
    expect(isScenarioId(value)).toBe(expected);
  });
});
