import { ScenarioRunStatus } from '@smart-campus/contracts';

import { ScenarioEngine } from '../../src/scenarios/domain/scenario-engine.js';
import { emptyCampusScenario } from '../../src/scenarios/fixtures/empty-campus.scenario.js';
import { nodeOfflineScenario } from '../../src/scenarios/fixtures/node-offline.scenario.js';
import {
  ScenarioTestBuilder,
  TEST_EPOCH_UTC,
} from '../../src/scenarios/testing/scenario-test-builder.js';

describe('ScenarioEngine lifecycle', () => {
  it('is IDLE after loading a scenario', () => {
    const engine = new ScenarioEngine(TEST_EPOCH_UTC);
    engine.loadScenario(emptyCampusScenario);
    expect(engine.getExecutionStatus().status).toBe(ScenarioRunStatus.IDLE);
  });

  it('accepts only the supported scenario speeds', () => {
    const engine = new ScenarioEngine(TEST_EPOCH_UTC);
    engine.loadScenario(emptyCampusScenario, { speed: 2 });
    expect(engine.getExecutionStatus().speed).toBe(2);
    expect(() => engine.loadScenario(emptyCampusScenario, { speed: 3 as never })).toThrow(
      '0.5, 1, 2, or 5',
    );
  });

  it('rejects advance before start', () => {
    const engine = new ScenarioTestBuilder().buildEngine();
    expect(() => engine.advanceBy(1)).toThrow('started before advancing');
  });

  it('is RUNNING after start', () => {
    const engine = new ScenarioTestBuilder().buildEngine();
    engine.start();
    expect(engine.getExecutionStatus().status).toBe(ScenarioRunStatus.RUNNING);
  });

  it('does not advance or consume events while paused', () => {
    const engine = new ScenarioTestBuilder()
      .withEvents([
        {
          atMs: 1_000,
          type: 'SENSOR_ACTIVATED',
          label: 'paused event',
          target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
          payload: {},
        },
      ])
      .buildEngine();
    engine.start();
    engine.pause();
    const before = engine.getExecutionStatus();
    const snapshot = engine.advanceBy(2_000);
    expect(engine.getExecutionStatus()).toEqual(before);
    expect(snapshot.sensors.find((sensor) => sensor.sensorId === 'sensor-ir-1')?.active).toBe(
      false,
    );
  });

  it('resumes from the paused virtual time', () => {
    const engine = new ScenarioTestBuilder().buildEngine();
    engine.start();
    engine.pause();
    engine.resume();
    engine.advanceBy(500);
    expect(engine.getExecutionStatus().nowMs).toBe(500);
  });

  it('does not change a completed snapshot on further advance', () => {
    const engine = new ScenarioTestBuilder().withDuration(1_000).buildEngine();
    engine.start();
    const completed = engine.advanceTo(1_000);
    expect(engine.advanceBy(1_000)).toEqual(completed);
  });

  it('reset reproduces the deterministic initial state', () => {
    const engine = new ScenarioTestBuilder().buildEngine();
    const initial = engine.getSnapshot();
    engine.start();
    engine.advanceBy(1_000);
    expect(engine.reset()).toEqual(initial);
  });

  it('loading another scenario does not leak state', () => {
    const engine = new ScenarioEngine(TEST_EPOCH_UTC);
    engine.loadScenario(nodeOfflineScenario);
    engine.start();
    engine.advanceTo(2_000);
    expect(engine.getSnapshot().activeAlerts).toHaveLength(1);
    const reloaded = engine.loadScenario(emptyCampusScenario);
    expect(reloaded.activeAlerts).toHaveLength(0);
    expect(reloaded.recentEvents).toHaveLength(0);
  });

  it('keeps independent engine instances isolated', () => {
    const first = new ScenarioEngine(TEST_EPOCH_UTC);
    const second = new ScenarioEngine(TEST_EPOCH_UTC);
    first.loadScenario(nodeOfflineScenario);
    second.loadScenario(nodeOfflineScenario);
    first.start();
    second.start();
    first.advanceTo(2_000);
    expect(first.getSnapshot().activeAlerts).toHaveLength(1);
    expect(second.getSnapshot().activeAlerts).toHaveLength(0);
  });
});
