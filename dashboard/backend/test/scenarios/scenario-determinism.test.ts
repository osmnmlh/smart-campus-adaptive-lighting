import { ScenarioEngine } from '../../src/scenarios/domain/scenario-engine.js';
import { leftToRightScenario } from '../../src/scenarios/fixtures/left-to-right.scenario.js';
import { TEST_EPOCH_UTC } from '../../src/scenarios/testing/scenario-test-builder.js';

const createStartedEngine = (): ScenarioEngine => {
  const engine = new ScenarioEngine(TEST_EPOCH_UTC);
  engine.loadScenario(leftToRightScenario);
  engine.start();
  return engine;
};

describe('scenario determinism', () => {
  it('produces deeply equal snapshots at every step for independent instances', () => {
    const first = createStartedEngine();
    const second = createStartedEngine();
    [1_000, 1_000, 4_000, 30_000, 5_000].forEach((step) => {
      expect(first.advanceBy(step)).toEqual(second.advanceBy(step));
    });
  });

  it('produces byte-equivalent JSON snapshots', () => {
    const first = createStartedEngine();
    const second = createStartedEngine();
    first.advanceTo(41_000);
    second.advanceTo(41_000);
    expect(JSON.stringify(first.getSnapshot())).toBe(JSON.stringify(second.getSnapshot()));
  });

  it('does not mutate the loaded scenario definition', () => {
    const input = JSON.parse(JSON.stringify(leftToRightScenario)) as typeof leftToRightScenario;
    const before = JSON.stringify(input);
    new ScenarioEngine(TEST_EPOCH_UTC).loadScenario(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('serializes without Date objects, functions, or undefined values', () => {
    const engine = createStartedEngine();
    const snapshot = engine.advanceTo(2_000);
    const visit = (value: unknown): void => {
      expect(value).not.toBeInstanceOf(Date);
      expect(typeof value).not.toBe('function');
      expect(value).not.toBeUndefined();
      if (Array.isArray(value)) value.forEach(visit);
      else if (value !== null && typeof value === 'object') Object.values(value).forEach(visit);
    };
    visit(snapshot);
    expect(() => JSON.parse(JSON.stringify(snapshot))).not.toThrow();
  });
});
