import { ScenarioDefinitionSchema } from '@smart-campus/contracts';
import {
  DEFAULT_SCENARIO_ID,
  getScenarioDefinition,
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
    expect(scenarioCatalog.map((item) => item.definition.name)).toEqual([
      'Empty Campus',
      'Left to Right',
      'Right to Left',
      'Center Presence',
      'Node Offline',
    ]);
    expect(DEFAULT_SCENARIO_ID).toBe('empty-campus');
  });

  it.each(scenarioCatalog)('validates $id through the shared contract', (item) => {
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
    expect(item.definition.events.every((event) => event.atMs <= item.definition.durationMs)).toBe(
      true,
    );
  });

  it('keeps the motion fixtures aligned with backend presentation semantics', () => {
    const left = getScenarioDefinition('left-to-right');
    const right = getScenarioDefinition('right-to-left');
    const center = getScenarioDefinition('center-presence');
    expect(left.durationMs).toBe(50_000);
    expect(left.events).toHaveLength(4);
    expect(left.events.map((event) => event.atMs)).toEqual([1_000, 2_000, 5_000, 6_000]);
    expect(left.events[0]?.target?.entityId).toBe('sensor-ir-1');
    expect(left.events[1]?.target?.entityId).toBe('sensor-ir-2');
    expect(right.durationMs).toBe(50_000);
    expect(right.events).toHaveLength(4);
    expect(right.events[0]?.target?.entityId).toBe('sensor-ir-5');
    expect(right.events[1]?.target?.entityId).toBe('sensor-ir-4');
    expect(center.durationMs).toBe(10_000);
    expect(center.events).toHaveLength(2);
    expect(center.events[0]?.target?.entityId).toBe('sensor-ir-3');
  });

  it('keeps empty and node-offline semantics explicit', () => {
    const empty = getScenarioDefinition('empty-campus');
    const offline = getScenarioDefinition('node-offline');
    expect(empty.durationMs).toBe(60_000);
    expect(empty.events).toEqual([]);
    expect(empty.tags).toContain('standby');
    expect(offline.durationMs).toBe(5_000);
    expect(offline.events).toHaveLength(2);
    expect(offline.events[0]?.type).toBe('SET_NODE_ONLINE');
    expect(offline.events[0]?.target?.entityId).toBe('node-2');
    expect(offline.events[0]?.payload).toEqual({ online: false });
    expect(offline.events[1]?.atMs).toBe(2_000);
  });
});
