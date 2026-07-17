import {
  createScenarioControllerState,
  scenarioControllerReducer,
} from '@/features/scenarios/scenario-reducer';
import {
  selectControlAvailability,
  selectDirection,
  selectProgressPercent,
  selectRemainingEventCount,
  selectSnapshotPreview,
  selectUpcomingEvents,
} from '@/features/scenarios/scenario-selectors';

const start = (id: 'left-to-right' | 'right-to-left' | 'center-presence' | 'node-offline') =>
  scenarioControllerReducer(createScenarioControllerState(id), { type: 'START' });

describe('scenario selectors', () => {
  it('derives initial progress and upcoming events', () => {
    const state = createScenarioControllerState('left-to-right');
    expect(selectProgressPercent(state)).toBe(0);
    expect(selectRemainingEventCount(state)).toBe(4);
    expect(selectUpcomingEvents(state)).toHaveLength(3);
    expect(selectUpcomingEvents(state)[0]?.label).toBe('IR1 entry');
    expect(selectUpcomingEvents(state)[1]?.atMs).toBe(2_000);
    expect(selectUpcomingEvents(state, 1)).toHaveLength(1);
    expect(selectDirection(state)).toBe('NONE');
  });

  it('derives left-to-right direction only after confirmation', () => {
    let state = start('left-to-right');
    state = scenarioControllerReducer(state, { type: 'STEP' });
    expect(state.processedEventCount).toBe(1);
    expect(selectDirection(state)).toBe('NONE');
    state = scenarioControllerReducer(state, { type: 'STEP' });
    expect(state.processedEventCount).toBe(2);
    expect(selectDirection(state)).toBe('LEFT_TO_RIGHT');
    expect(selectProgressPercent(state)).toBe(4);
    expect(selectRemainingEventCount(state)).toBe(2);
    expect(selectUpcomingEvents(state)[0]?.label).toBe('IR1 clears');
  });

  it('derives right-to-left but never invents center direction', () => {
    let right = start('right-to-left');
    right = scenarioControllerReducer(right, { type: 'ADVANCE' });
    let center = start('center-presence');
    center = scenarioControllerReducer(center, { type: 'ADVANCE' });
    expect(selectDirection(right)).toBe('RIGHT_TO_LEFT');
    expect(selectDirection(center)).toBe('NONE');
    expect(center.processedEventCount).toBe(2);
    expect(center.activeSensorIds).toEqual([]);
    expect(selectRemainingEventCount(center)).toBe(0);
  });

  it('builds a simulated, good-quality snapshot without electrical values', () => {
    const snapshot = selectSnapshotPreview(createScenarioControllerState());
    expect(snapshot.snapshotAt).toBe('2026-06-15T20:30:00.000Z');
    expect(snapshot.systemMode).toBe('AUTO_ADAPTIVE');
    expect(snapshot.lifecycle).toBe('READY');
    expect(snapshot.direction).toBe('NONE');
    expect(snapshot.nodeCount).toBe(3);
    expect(snapshot.onlineNodeCount).toBe(3);
    expect(snapshot.lampCount).toBe(5);
    expect(snapshot.activeLampCount).toBe(0);
    expect(snapshot.sensorCount).toBe(6);
    expect(snapshot.activeSensorCount).toBe(0);
    expect(snapshot.activeAlertCount).toBe(0);
    expect(snapshot.source).toBe('SIMULATED');
    expect(snapshot.quality).toBe('GOOD');
    expect(snapshot).not.toHaveProperty('current');
    expect(snapshot).not.toHaveProperty('voltage');
    expect(snapshot).not.toHaveProperty('power');
  });

  it('reflects presence and the node-offline alert in snapshots', () => {
    let motion = start('left-to-right');
    motion = scenarioControllerReducer(motion, { type: 'ADVANCE' });
    const motionSnapshot = selectSnapshotPreview(motion);
    let offline = start('node-offline');
    offline = scenarioControllerReducer(offline, { type: 'STEP' });
    const offlineSnapshot = selectSnapshotPreview(offline);
    expect(motionSnapshot.activeSensorCount).toBe(1);
    expect(motionSnapshot.activeLampCount).toBe(1);
    expect(motionSnapshot.direction).toBe('LEFT_TO_RIGHT');
    expect(motionSnapshot.snapshotAt).toBe('2026-06-15T20:30:05.000Z');
    expect(offlineSnapshot.onlineNodeCount).toBe(2);
    expect(offlineSnapshot.activeAlertCount).toBe(1);
    expect(offlineSnapshot.nodeCount).toBe(3);
    expect(offlineSnapshot.source).toBe('SIMULATED');
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
