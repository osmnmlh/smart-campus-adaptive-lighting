import {
  DataSource,
  Direction,
  SystemSnapshotSchema,
  type ScenarioDefinition,
} from '@smart-campus/contracts';

import { ScenarioEngine } from '../../src/scenarios/domain/scenario-engine.js';
import { centerPresenceScenario } from '../../src/scenarios/fixtures/center-presence.scenario.js';
import { emptyCampusScenario } from '../../src/scenarios/fixtures/empty-campus.scenario.js';
import { leftToRightScenario } from '../../src/scenarios/fixtures/left-to-right.scenario.js';
import { nodeOfflineScenario } from '../../src/scenarios/fixtures/node-offline.scenario.js';
import { rightToLeftScenario } from '../../src/scenarios/fixtures/right-to-left.scenario.js';
import { TEST_EPOCH_UTC } from '../../src/scenarios/testing/scenario-test-builder.js';

const runTo = (scenario: ScenarioDefinition, atMs: number) => {
  const engine = new ScenarioEngine(TEST_EPOCH_UTC);
  engine.loadScenario(scenario);
  engine.start();
  return engine.advanceTo(atMs);
};

const lampBrightness = (snapshot: ReturnType<typeof runTo>, lampId: string): number =>
  snapshot.lamps.find((lamp) => lamp.lampId === lampId)!.brightnessPercent;

describe('scenario fixtures', () => {
  it('empty campus produces a valid standby snapshot without alerts', () => {
    const snapshot = runTo(emptyCampusScenario, 1_000);
    expect(SystemSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(snapshot.lamps.every((lamp) => lamp.brightnessPercent === 30)).toBe(true);
    expect(snapshot.activeAlerts).toHaveLength(0);
  });

  it('left-to-right confirms direction and pre-lights the next segment', () => {
    const snapshot = runTo(leftToRightScenario, 2_000);
    expect(snapshot.direction.direction).toBe(Direction.LEFT_TO_RIGHT);
    expect([lampBrightness(snapshot, 'lamp-1'), lampBrightness(snapshot, 'lamp-2')]).toEqual([
      100, 100,
    ]);
    expect(lampBrightness(snapshot, 'lamp-3')).toBe(60);
  });

  it('right-to-left confirms direction and pre-lights backwards', () => {
    const snapshot = runTo(rightToLeftScenario, 2_000);
    expect(snapshot.direction.direction).toBe(Direction.RIGHT_TO_LEFT);
    expect([lampBrightness(snapshot, 'lamp-5'), lampBrightness(snapshot, 'lamp-4')]).toEqual([
      100, 100,
    ]);
    expect(lampBrightness(snapshot, 'lamp-3')).toBe(60);
  });

  it('center presence activates L3 without producing direction', () => {
    const snapshot = runTo(centerPresenceScenario, 2_000);
    expect(snapshot.direction.direction).toBe(Direction.UNKNOWN);
    expect(lampBrightness(snapshot, 'lamp-3')).toBe(100);
    expect([lampBrightness(snapshot, 'lamp-2'), lampBrightness(snapshot, 'lamp-4')]).toEqual([
      60, 60,
    ]);
  });

  it('node offline changes health and creates an alert', () => {
    const snapshot = runTo(nodeOfflineScenario, 1_000);
    const node = snapshot.nodes.find((candidate) => candidate.nodeId === 'node-2');
    expect(node).toMatchObject({ online: false, health: 'OFFLINE' });
    expect(snapshot.activeAlerts).toHaveLength(1);
    expect(snapshot.activeAlerts[0]?.code).toBe('NODE_OFFLINE');
  });

  it('does not create duplicate alerts for a continuing node fault', () => {
    expect(runTo(nodeOfflineScenario, 2_000).activeAlerts).toHaveLength(1);
  });

  it('holds active brightness for the mock 30-second window', () => {
    const snapshot = runTo(leftToRightScenario, 36_000);
    expect(lampBrightness(snapshot, 'lamp-1')).toBe(100);
  });

  it('fades deterministically after the hold window', () => {
    const snapshot = runTo(leftToRightScenario, 41_000);
    expect(lampBrightness(snapshot, 'lamp-1')).toBe(65);
  });

  it('marks mock metrics and direction as SIMULATED', () => {
    const snapshot = runTo(leftToRightScenario, 2_000);
    expect(snapshot.lux?.source).toBe(DataSource.SIMULATED);
    expect(snapshot.instantPower.source).toBe(DataSource.SIMULATED);
    expect(snapshot.direction.source).toBe(DataSource.SIMULATED);
  });
});
