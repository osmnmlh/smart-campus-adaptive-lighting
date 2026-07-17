import {
  createScenarioControllerState,
  scenarioControllerReducer,
} from '@/features/scenarios/scenario-reducer';

const reduce = scenarioControllerReducer;

describe('scenario controller reducer', () => {
  it('creates explicit idle and ready states', () => {
    const idle = createScenarioControllerState(null);
    const ready = createScenarioControllerState();
    expect(idle.lifecycle).toBe('IDLE');
    expect(idle.definition).toBeNull();
    expect(idle.selectedScenarioId).toBeNull();
    expect(idle.elapsedMs).toBe(0);
    expect(idle.presentationSequence).toBe(0);
    expect(idle.recentEvents).toEqual([]);
    expect(ready.lifecycle).toBe('READY');
    expect(ready.selectedScenarioId).toBe('empty-campus');
    expect(ready.definition?.durationMs).toBe(60_000);
    expect(ready.speed).toBe(1);
    expect(ready.errorMessage).toBeNull();
  });

  it('moves through start, pause, resume, and reset', () => {
    const ready = createScenarioControllerState('left-to-right');
    const running = reduce(ready, { type: 'START' });
    const paused = reduce(running, { type: 'PAUSE' });
    const resumed = reduce(paused, { type: 'RESUME' });
    const reset = reduce(resumed, { type: 'RESET' });
    expect(running.lifecycle).toBe('RUNNING');
    expect(running.recentEvents.at(-1)?.type).toBe('SCENARIO_STARTED');
    expect(paused.lifecycle).toBe('PAUSED');
    expect(paused.recentEvents).toHaveLength(2);
    expect(paused.recentEvents.at(-1)?.type).toBe('SCENARIO_PAUSED');
    expect(resumed.lifecycle).toBe('RUNNING');
    expect(resumed.recentEvents).toHaveLength(3);
    expect(resumed.recentEvents.at(-1)?.type).toBe('SCENARIO_RESUMED');
    expect(reset.lifecycle).toBe('READY');
    expect(reset.elapsedMs).toBe(0);
    expect(reset.recentEvents).toEqual([]);
    expect(reset.presentationSequence).toBe(0);
    expect(reset.activeSensorIds).toEqual([]);
  });

  it('ignores lifecycle actions that are invalid for the current state', () => {
    const ready = createScenarioControllerState();
    expect(reduce(ready, { type: 'PAUSE' })).toBe(ready);
    expect(reduce(ready, { type: 'RESUME' })).toBe(ready);
    expect(reduce(ready, { type: 'STEP' })).toBe(ready);
    const running = reduce(ready, { type: 'START' });
    expect(reduce(running, { type: 'START' })).toBe(running);
    expect(reduce(running, { type: 'RESUME' })).toBe(running);
    const paused = reduce(running, { type: 'PAUSE' });
    expect(reduce(paused, { type: 'PAUSE' })).toBe(paused);
    expect(reduce(paused, { type: 'ADVANCE' })).toBe(paused);
  });

  it.each([
    { speed: 0.5 as const, expected: 500 },
    { speed: 1 as const, expected: 1_000 },
    { speed: 2 as const, expected: 2_000 },
    { speed: 5 as const, expected: 5_000 },
  ])('applies $speed x only to virtual step delta', ({ speed, expected }) => {
    let state = reduce(createScenarioControllerState(), { type: 'SET_SPEED', speed });
    expect(state.speed).toBe(speed);
    expect(state.elapsedMs).toBe(0);
    state = reduce(state, { type: 'START' });
    state = reduce(state, { type: 'STEP' });
    expect(state.elapsedMs).toBe(expected);
    expect(state.lifecycle).toBe('RUNNING');
  });

  it('consumes ordered events through the target time', () => {
    let state = reduce(createScenarioControllerState('left-to-right'), { type: 'START' });
    state = reduce(state, { type: 'ADVANCE' });
    expect(state.elapsedMs).toBe(5_000);
    expect(state.processedEventCount).toBe(3);
    expect(state.activeSensorIds).toEqual(['sensor-ir-2']);
    expect(state.recentEvents.map((event) => event.label)).toEqual([
      'running',
      'IR1 entry',
      'IR2 confirms direction',
      'IR1 clears',
    ]);
    state = reduce(state, { type: 'STEP' });
    expect(state.elapsedMs).toBe(6_000);
    expect(state.processedEventCount).toBe(4);
    expect(state.activeSensorIds).toEqual([]);
  });

  it('deduplicates offline nodes and completes at the duration boundary', () => {
    let state = reduce(createScenarioControllerState('node-offline'), { type: 'START' });
    state = reduce(state, { type: 'SET_SPEED', speed: 5 });
    state = reduce(state, { type: 'ADVANCE' });
    expect(state.elapsedMs).toBe(5_000);
    expect(state.lifecycle).toBe('COMPLETED');
    expect(state.processedEventCount).toBe(2);
    expect(state.offlineNodeIds).toEqual(['node-2']);
    expect(state.recentEvents.at(-1)?.type).toBe('SCENARIO_COMPLETED');
    expect(reduce(state, { type: 'STEP' })).toBe(state);
  });

  it('switches scenarios by rebuilding a clean ready state', () => {
    let state = reduce(createScenarioControllerState('center-presence'), { type: 'START' });
    state = reduce(state, { type: 'ADVANCE' });
    const selected = reduce(state, { type: 'SELECT_SCENARIO', scenarioId: 'node-offline' });
    expect(selected.selectedScenarioId).toBe('node-offline');
    expect(selected.definition?.name).toBe('Node Offline');
    expect(selected.lifecycle).toBe('READY');
    expect(selected.elapsedMs).toBe(0);
    expect(selected.processedEventCount).toBe(0);
    expect(selected.activeSensorIds).toEqual([]);
    expect(selected.offlineNodeIds).toEqual([]);
    expect(selected.recentEvents).toEqual([]);
  });

  it('caps the presentation log at ten entries', () => {
    let state = reduce(createScenarioControllerState('left-to-right'), { type: 'START' });
    for (let index = 0; index < 8; index += 1) {
      state = reduce(state, { type: 'PAUSE' });
      state = reduce(state, { type: 'RESUME' });
    }
    expect(state.recentEvents).toHaveLength(10);
    expect(state.recentEvents[0]?.type).not.toBe('SCENARIO_STARTED');
    expect(state.recentEvents.at(-1)?.type).toBe('SCENARIO_RESUMED');
    expect(new Set(state.recentEvents.map((event) => event.id)).size).toBe(10);
    expect(state.presentationSequence).toBe(17);
  });
});
