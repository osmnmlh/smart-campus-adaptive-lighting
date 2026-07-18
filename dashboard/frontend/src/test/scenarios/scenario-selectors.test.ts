import {
  advanceScenario,
  createScenarioControllerState,
} from '@/features/scenarios/scenario-controller';
import { scenarioControllerReducer } from '@/features/scenarios/scenario-reducer';
import {
  selectControlAvailability,
  selectProgressPercent,
  selectRemainingEventCount,
  selectSnapshotPreview,
  selectUpcomingEvents,
} from '@/features/scenarios/scenario-selectors';
import type { ScenarioId, ScenarioLampId } from '@/features/scenarios/scenario-model';

const reduce = scenarioControllerReducer;
const start = (id: ScenarioId) =>
  reduce(reduce(createScenarioControllerState(), { type: 'SELECT_SCENARIO', scenarioId: id }), {
    type: 'START',
  });
const lampState = (state: ReturnType<typeof start>, lampId: ScenarioLampId) =>
  state.lamps.find((lamp) => lamp.lampId === lampId)?.operatingState;

describe('scenario selectors', () => {
  it('returns safe empty projections for the initial IDLE state', () => {
    const state = createScenarioControllerState();
    expect(selectSnapshotPreview(state)).toBeNull();
    expect(selectProgressPercent(state)).toBe(0);
    expect(selectRemainingEventCount(state)).toBe(0);
    expect(selectUpcomingEvents(state)).toEqual([]);
  });

  it('derives initial selected progress and upcoming events', () => {
    const state = reduce(createScenarioControllerState(), {
      type: 'SELECT_SCENARIO',
      scenarioId: 'left-to-right',
    });
    expect(selectProgressPercent(state)).toBe(0);
    expect(selectRemainingEventCount(state)).toBe(10);
    expect(selectUpcomingEvents(state)).toHaveLength(3);
    expect(selectUpcomingEvents(state)[0]?.label).toBe('IR1 entry');
    expect(selectUpcomingEvents(state)[1]?.label).toBe('IR1 clears');
    expect(selectUpcomingEvents(state)[2]?.label).toBe('IR2 confirms direction');
    expect(selectUpcomingEvents(state, 1)).toHaveLength(1);
  });

  it('builds a complete simulated baseline snapshot without mutating state', () => {
    const state = reduce(createScenarioControllerState(), {
      type: 'SELECT_SCENARIO',
      scenarioId: 'empty-campus',
    });
    const before = JSON.stringify(state);
    const snapshot = selectSnapshotPreview(state);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.virtualTimestamp).toBe('2026-06-15T20:30:00.000Z');
    expect(snapshot?.systemMode).toBe('AUTO_ADAPTIVE');
    expect(snapshot?.lifecycle).toBe('READY');
    expect(snapshot?.direction).toBe('NONE');
    expect(snapshot?.totalNodeCount).toBe(3);
    expect(snapshot?.activeNodeCount).toBe(3);
    expect(snapshot?.totalLampCount).toBe(5);
    expect(snapshot?.activeLampCount).toBe(0);
    expect(snapshot?.preLightLampCount).toBe(0);
    expect(snapshot?.standbyLampCount).toBe(5);
    expect(snapshot?.offLampCount).toBe(0);
    expect(snapshot?.totalSensorCount).toBe(6);
    expect(snapshot?.activeSensorCount).toBe(0);
    expect(snapshot?.activeSensorIds).toEqual([]);
    expect(snapshot?.activeAlertCount).toBe(0);
    expect(snapshot?.source).toBe('SIMULATED');
    expect(snapshot?.quality).toBe('GOOD');
    expect(JSON.stringify(state)).toBe(before);
    expect(snapshot).not.toHaveProperty('current');
    expect(snapshot).not.toHaveProperty('voltage');
    expect(snapshot).not.toHaveProperty('power');
  });

  it.each([
    [1_000, 'lamp-1', 'lamp-2', 'sensor-ir-1', 'NONE'],
    [2_000, 'lamp-2', 'lamp-3', 'sensor-ir-2', 'LEFT_TO_RIGHT'],
    [3_000, 'lamp-3', 'lamp-4', 'sensor-ir-3', 'LEFT_TO_RIGHT'],
    [4_000, 'lamp-4', 'lamp-5', 'sensor-ir-4', 'LEFT_TO_RIGHT'],
    [5_000, 'lamp-5', 'lamp-4', 'sensor-ir-5', 'LEFT_TO_RIGHT'],
  ] as const)(
    'models LTR lamp progression at %i ms',
    (elapsedMs, activeLampId, adjacentLampId, sensorId, direction) => {
      const state = advanceScenario(start('left-to-right'), elapsedMs);
      const snapshot = selectSnapshotPreview(state);
      expect(state.elapsedMs).toBe(elapsedMs);
      expect(lampState(state, activeLampId)).toBe('ACTIVE');
      expect(lampState(state, adjacentLampId)).toBe('PRE_LIGHT');
      expect(state.activeSensorIds).toEqual([sensorId]);
      expect(state.direction).toBe(direction);
      expect(snapshot?.activeLampCount).toBe(1);
      expect(snapshot?.preLightLampCount).toBe(elapsedMs === 1_000 || elapsedMs === 5_000 ? 1 : 2);
      expect(snapshot?.standbyLampCount).toBe(
        5 - 1 - (elapsedMs === 1_000 || elapsedMs === 5_000 ? 1 : 2),
      );
      expect(snapshot?.activeSensorIds).toEqual([sensorId]);
    },
  );

  it.each([
    [1_000, 'lamp-5', 'lamp-4', 'sensor-ir-5', 'NONE'],
    [2_000, 'lamp-4', 'lamp-3', 'sensor-ir-4', 'RIGHT_TO_LEFT'],
    [3_000, 'lamp-3', 'lamp-2', 'sensor-ir-3', 'RIGHT_TO_LEFT'],
    [4_000, 'lamp-2', 'lamp-1', 'sensor-ir-2', 'RIGHT_TO_LEFT'],
    [5_000, 'lamp-1', 'lamp-2', 'sensor-ir-1', 'RIGHT_TO_LEFT'],
  ] as const)(
    'models RTL lamp progression at %i ms',
    (elapsedMs, activeLampId, adjacentLampId, sensorId, direction) => {
      const state = advanceScenario(start('right-to-left'), elapsedMs);
      const snapshot = selectSnapshotPreview(state);
      expect(state.elapsedMs).toBe(elapsedMs);
      expect(lampState(state, activeLampId)).toBe('ACTIVE');
      expect(lampState(state, adjacentLampId)).toBe('PRE_LIGHT');
      expect(state.activeSensorIds).toEqual([sensorId]);
      expect(state.direction).toBe(direction);
      expect(snapshot?.activeLampCount).toBe(1);
      expect(snapshot?.activeSensorIds).toEqual([sensorId]);
      expect(snapshot?.activeLampCount).toBe(1);
      expect(
        (snapshot?.activeLampCount ?? 0) +
          (snapshot?.preLightLampCount ?? 0) +
          (snapshot?.standbyLampCount ?? 0) +
          (snapshot?.offLampCount ?? 0),
      ).toBe(5);
    },
  );

  it('keeps active sensor IDs canonical, unique, and immutable', () => {
    const state = {
      ...start('left-to-right'),
      activeSensorIds: ['sensor-ir-5', 'sensor-ir-1', 'sensor-ir-1'],
    };
    const advanced = advanceScenario(state, 1_000);
    const snapshot = selectSnapshotPreview(advanced);
    expect(advanced.activeSensorIds).toEqual(['sensor-ir-1', 'sensor-ir-5']);
    expect(snapshot?.activeSensorIds).toEqual(['sensor-ir-1', 'sensor-ir-5']);
    expect(new Set(snapshot?.activeSensorIds).size).toBe(snapshot?.activeSensorIds.length);
    expect(snapshot?.activeSensorIds).not.toBe(advanced.activeSensorIds);
  });

  it('models center presence without direction', () => {
    const state = advanceScenario(start('center-presence'), 1_000);
    const snapshot = selectSnapshotPreview(state);
    expect(state.direction).toBe('NONE');
    expect(state.activeSensorIds).toEqual(['sensor-ir-3']);
    expect(lampState(state, 'lamp-3')).toBe('ACTIVE');
    expect(lampState(state, 'lamp-2')).toBe('PRE_LIGHT');
    expect(lampState(state, 'lamp-4')).toBe('PRE_LIGHT');
    expect(snapshot?.activeLampCount).toBe(1);
    expect(snapshot?.preLightLampCount).toBe(2);
    expect(snapshot?.activeSensorIds).toEqual(['sensor-ir-3']);
  });

  it('models one node-offline alert and an explicit lamp effect', () => {
    const state = advanceScenario(start('node-offline'), 2_000);
    const snapshot = selectSnapshotPreview(state);
    expect(state.offlineNodeIds).toEqual(['node-2']);
    expect(snapshot?.activeNodeCount).toBe(2);
    expect(snapshot?.activeAlertCount).toBe(1);
    expect(snapshot?.offLampCount).toBe(1);
    expect(snapshot?.standbyLampCount).toBe(4);
    expect(lampState(state, 'lamp-3')).toBe('OFF');
  });

  it('returns lamps and sensors to baseline at the final motion event', () => {
    const state = advanceScenario(start('left-to-right'), 6_000);
    const snapshot = selectSnapshotPreview(state);
    expect(state.activeSensorIds).toEqual([]);
    expect(state.lamps.every((lamp) => lamp.operatingState === 'STANDBY')).toBe(true);
    expect(snapshot?.activeLampCount).toBe(0);
    expect(snapshot?.preLightLampCount).toBe(0);
    expect(snapshot?.standbyLampCount).toBe(5);
    expect(snapshot?.activeSensorIds).toEqual([]);
    expect(state.direction).toBe('LEFT_TO_RIGHT');
  });

  it('clamps progress and reaches exactly one hundred percent at completion', () => {
    const state = advanceScenario(start('node-offline'), 50_000);
    expect(state.lifecycle).toBe('COMPLETED');
    expect(state.elapsedMs).toBe(5_000);
    expect(selectProgressPercent(state)).toBe(100);
    expect(selectRemainingEventCount(state)).toBe(0);
    expect(selectUpcomingEvents(state)).toEqual([]);
  });

  it.each([
    ['IDLE', false, false, false, false, false],
    ['READY', true, false, false, false, false],
    ['RUNNING', false, true, false, true, true],
    ['PAUSED', false, false, true, true, false],
    ['COMPLETED', false, false, false, true, false],
    ['ERROR', false, false, false, true, false],
  ] as const)(
    'maps %s control availability',
    (lifecycle, startable, pausable, resumable, resettable, advanceable) => {
      const controls = selectControlAvailability(lifecycle);
      expect(controls.canStart).toBe(startable);
      expect(controls.canPause).toBe(pausable);
      expect(controls.canResume).toBe(resumable);
      expect(controls.canReset).toBe(resettable);
      expect(controls.canAdvance).toBe(advanceable);
    },
  );
});
