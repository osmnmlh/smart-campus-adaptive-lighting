import {
  advanceScenario,
  createScenarioControllerState,
  isPlaybackSpeed,
  setPlaybackSpeed,
} from '@/features/scenarios/scenario-controller';
import { scenarioControllerReducer } from '@/features/scenarios/scenario-reducer';
import { selectProgressPercent } from '@/features/scenarios/scenario-selectors';
import type { ScenarioControllerState } from '@/features/scenarios/scenario-model';

const reduce = scenarioControllerReducer;
const ready = (
  id:
    | 'empty-campus'
    | 'left-to-right'
    | 'right-to-left'
    | 'center-presence'
    | 'node-offline' = 'empty-campus',
) => reduce(createScenarioControllerState(), { type: 'SELECT_SCENARIO', scenarioId: id });
const running = (id: Parameters<typeof ready>[0] = 'empty-campus') =>
  reduce(ready(id), { type: 'START' });

describe('scenario controller reducer', () => {
  it('creates an explicit unselected IDLE state', () => {
    const state = createScenarioControllerState();
    expect(state.lifecycle).toBe('IDLE');
    expect(state.definition).toBeNull();
    expect(state.selectedScenarioId).toBeNull();
    expect(state.elapsedMs).toBe(0);
    expect(state.direction).toBe('NONE');
    expect(state.lamps).toHaveLength(5);
    expect(state.processedEventCount).toBe(0);
    expect(state.presentationSequence).toBe(0);
    expect(state.recentEvents).toEqual([]);
    expect(state.lastError).toBeNull();
  });

  it('selects a scenario into a clean READY state', () => {
    const state = ready('left-to-right');
    expect(state.lifecycle).toBe('READY');
    expect(state.selectedScenarioId).toBe('left-to-right');
    expect(state.definition?.durationMs).toBe(50_000);
    expect(state.elapsedMs).toBe(0);
    expect(state.processedEventCount).toBe(0);
    expect(state.activeSensorIds).toEqual([]);
    expect(state.lamps.every((lamp) => lamp.operatingState === 'STANDBY')).toBe(true);
    expect(state.lastError).toBeNull();
  });

  it('moves through start, pause, resume, and reset', () => {
    const selected = ready('left-to-right');
    const started = reduce(selected, { type: 'START' });
    const paused = reduce(started, { type: 'PAUSE' });
    const resumed = reduce(paused, { type: 'RESUME' });
    const reset = reduce(resumed, { type: 'RESET' });
    expect(started.lifecycle).toBe('RUNNING');
    expect(started.recentEvents.at(-1)?.type).toBe('SCENARIO_STARTED');
    expect(paused.lifecycle).toBe('PAUSED');
    expect(paused.recentEvents.at(-1)?.type).toBe('SCENARIO_PAUSED');
    expect(resumed.lifecycle).toBe('RUNNING');
    expect(resumed.recentEvents.at(-1)?.type).toBe('SCENARIO_RESUMED');
    expect(reset.lifecycle).toBe('READY');
    expect(reset.elapsedMs).toBe(0);
    expect(reset.recentEvents).toEqual([]);
    expect(reset.activeSensorIds).toEqual([]);
    expect(reset.lastError).toBeNull();
  });

  it.each([
    ['IDLE START', createScenarioControllerState(), { type: 'START' } as const, 'IDLE'],
    ['READY PAUSE', ready(), { type: 'PAUSE' } as const, 'READY'],
    ['READY RESUME', ready(), { type: 'RESUME' } as const, 'READY'],
    ['RUNNING START', running(), { type: 'START' } as const, 'RUNNING'],
    ['PAUSED STEP', reduce(running(), { type: 'PAUSE' }), { type: 'STEP' } as const, 'PAUSED'],
    [
      'PAUSED ADVANCE',
      reduce(running(), { type: 'PAUSE' }),
      { type: 'ADVANCE' } as const,
      'PAUSED',
    ],
    [
      'COMPLETED STEP',
      reduce(reduce(running('node-offline'), { type: 'SET_SPEED', speed: 5 }), { type: 'ADVANCE' }),
      { type: 'STEP' } as const,
      'COMPLETED',
    ],
    [
      'COMPLETED ADVANCE',
      reduce(reduce(running('node-offline'), { type: 'SET_SPEED', speed: 5 }), { type: 'ADVANCE' }),
      { type: 'ADVANCE' } as const,
      'COMPLETED',
    ],
  ])('%s produces a recoverable deterministic error', (_label, state, action, lifecycle) => {
    const beforeProgress = selectProgressPercent(state as ScenarioControllerState);
    const result = reduce(state as ScenarioControllerState, action);
    expect(result).not.toBe(state);
    expect(result.lifecycle).toBe(lifecycle);
    expect(result.elapsedMs).toBe((state as ScenarioControllerState).elapsedMs);
    expect(result.processedEventCount).toBe((state as ScenarioControllerState).processedEventCount);
    expect(result.recentEvents).toEqual((state as ScenarioControllerState).recentEvents);
    expect(selectProgressPercent(result)).toBe(beforeProgress);
    expect(result.lastError?.code).toBe('INVALID_TRANSITION');
    expect(result.lastError?.message).not.toContain('Error:');
  });

  it('clears a recoverable error on the next valid action', () => {
    const rejected = reduce(ready(), { type: 'PAUSE' });
    const started = reduce(rejected, { type: 'START' });
    expect(rejected.lastError?.action).toBe('PAUSE');
    expect(started.lifecycle).toBe('RUNNING');
    expect(started.lastError).toBeNull();
    expect(started.elapsedMs).toBe(0);
  });

  it('recovers a selected fatal ERROR state through RESET', () => {
    const advanced = reduce(running('left-to-right'), { type: 'ADVANCE' });
    const fatal: ScenarioControllerState = {
      ...advanced,
      lifecycle: 'ERROR',
      lastError: {
        code: 'SCENARIO_LOAD_FAILED',
        action: 'ADVANCE',
        lifecycle: 'RUNNING',
        message: 'Safe fatal presentation error.',
      },
    };
    const recovered = reduce(fatal, { type: 'RESET' });
    expect(recovered.lifecycle).toBe('READY');
    expect(recovered.selectedScenarioId).toBe('left-to-right');
    expect(recovered.elapsedMs).toBe(0);
    expect(recovered.processedEventCount).toBe(0);
    expect(recovered.activeSensorIds).toEqual([]);
    expect(recovered.recentEvents).toEqual([]);
    expect(recovered.lamps.every((lamp) => lamp.operatingState === 'STANDBY')).toBe(true);
    expect(recovered.lastError).toBeNull();
  });

  it('recovers ERROR through a valid scenario selection', () => {
    const fatal: ScenarioControllerState = {
      ...ready('center-presence'),
      lifecycle: 'ERROR',
      lastError: {
        code: 'SCENARIO_LOAD_FAILED',
        action: 'ADVANCE',
        lifecycle: 'RUNNING',
        message: 'Safe fatal presentation error.',
      },
    };
    const recovered = reduce(fatal, { type: 'SELECT_SCENARIO', scenarioId: 'node-offline' });
    expect(recovered.lifecycle).toBe('READY');
    expect(recovered.selectedScenarioId).toBe('node-offline');
    expect(recovered.elapsedMs).toBe(0);
    expect(recovered.lastError).toBeNull();
  });

  it('preserves fatal error context when speed changes before recovery', () => {
    const fatal: ScenarioControllerState = {
      ...ready('left-to-right'),
      lifecycle: 'ERROR',
      lastError: {
        code: 'SCENARIO_LOAD_FAILED',
        action: 'ADVANCE',
        lifecycle: 'RUNNING',
        message: 'Safe fatal presentation error.',
      },
    };

    const changed = setPlaybackSpeed(fatal, 2);

    expect(changed.speed).toBe(2);
    expect(changed.selectedScenarioId).toBe('left-to-right');
    expect(changed.lastError).toEqual(fatal.lastError);
  });

  it('rejects an unknown scenario without corrupting current state', () => {
    const current = ready('left-to-right');
    const result = reduce(current, { type: 'SELECT_SCENARIO', scenarioId: 'not-a-scenario' });
    expect(result.lifecycle).toBe('READY');
    expect(result.selectedScenarioId).toBe('left-to-right');
    expect(result.definition).toBe(current.definition);
    expect(result.elapsedMs).toBe(0);
    expect(result.lastError?.code).toBe('UNKNOWN_SCENARIO');
    expect(result.lastError?.message).toBe('The selected local scenario is not available.');
  });

  it.each([0.5, 1, 2, 5])('accepts runtime speed %s', (speed) => {
    const state = setPlaybackSpeed(ready(), speed);
    expect(isPlaybackSpeed(speed)).toBe(true);
    expect(state.speed).toBe(speed);
    expect(state.lastError).toBeNull();
    expect(state.elapsedMs).toBe(0);
  });

  it.each([0, -1, 0.25, 3, Number.NaN, Number.POSITIVE_INFINITY, '2', {}, null, undefined])(
    'rejects invalid runtime speed %j',
    (speed) => {
      const initial = ready();
      const result = setPlaybackSpeed(initial, speed);
      expect(isPlaybackSpeed(speed)).toBe(false);
      expect(result.speed).toBe(1);
      expect(result.elapsedMs).toBe(0);
      expect(result.lastError?.code).toBe('INVALID_SPEED');
      expect(result.lastError?.action).toBe('SET_SPEED');
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, '1000', null])(
    'rejects invalid virtual delta %j without processing',
    (delta) => {
      const initial = running('left-to-right');
      const result = advanceScenario(initial, delta);
      expect(result.elapsedMs).toBe(0);
      expect(result.processedEventCount).toBe(0);
      expect(result.recentEvents).toEqual(initial.recentEvents);
      expect(result.lifecycle).toBe('RUNNING');
      expect(result.lastError?.code).toBe('INVALID_DELTA');
    },
  );

  it('treats zero delta as safe no-change success', () => {
    const initial = reduce(running(), { type: 'PAUSE' });
    const withError = advanceScenario(initial, 1_000);
    const resumed = reduce(withError, { type: 'RESUME' });
    const result = advanceScenario(resumed, 0);
    expect(result.elapsedMs).toBe(0);
    expect(result.processedEventCount).toBe(0);
    expect(result.lifecycle).toBe('RUNNING');
    expect(result.lastError).toBeNull();
  });

  it.each([
    [0.5, 500],
    [1, 1_000],
    [2, 2_000],
    [5, 5_000],
  ])('applies %s x only to the validated integer virtual delta', (speed, expected) => {
    let state = reduce(running('empty-campus'), { type: 'SET_SPEED', speed });
    state = reduce(state, { type: 'STEP' });
    expect(state.speed).toBe(speed);
    expect(state.elapsedMs).toBe(expected);
    expect(Number.isInteger(state.elapsedMs)).toBe(true);
    expect(state.lifecycle).toBe('RUNNING');
  });

  it('preserves insertion order and never reprocesses events', () => {
    let state = running('left-to-right');
    state = reduce(state, { type: 'SET_SPEED', speed: 2 });
    state = reduce(state, { type: 'STEP' });
    expect(state.elapsedMs).toBe(2_000);
    expect(state.processedEventCount).toBe(3);
    expect(state.recentEvents.slice(-3).map((event) => event.label)).toEqual([
      'IR1 entry',
      'IR1 clears',
      'IR2 confirms direction',
    ]);
    const ids = state.recentEvents.map((event) => event.id);
    state = advanceScenario(state, 0);
    expect(state.processedEventCount).toBe(3);
    expect(state.recentEvents.map((event) => event.id)).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('deduplicates the offline node and produces one alert count source', () => {
    let state = running('node-offline');
    state = reduce(state, { type: 'ADVANCE' });
    expect(state.lifecycle).toBe('COMPLETED');
    expect(state.processedEventCount).toBe(2);
    expect(state.offlineNodeIds).toEqual(['node-2']);
    expect(state.lamps.find((lamp) => lamp.lampId === 'lamp-3')?.operatingState).toBe('OFF');
    expect(state.recentEvents.at(-1)?.type).toBe('SCENARIO_COMPLETED');
  });

  it('caps deterministic presentation events at ten unique IDs', () => {
    let state = running('left-to-right');
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
