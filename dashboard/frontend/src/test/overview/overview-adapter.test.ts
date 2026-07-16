import {
  AlertSeverity,
  DataSource,
  MetricQuality,
  SystemMode,
  SystemSnapshotSchema,
} from '@smart-campus/contracts';
import {
  createOverviewModel,
  createValidatedOverviewModel,
} from '@/features/overview/overview-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

describe('overview adapter', () => {
  it('node totals and online count are derived from the snapshot', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.summary.totalNodes).toBe(3);
    expect(model.summary.onlineNodes).toBe(3);
    expect(model.summary.offlineNodes).toBe(0);
    expect(model.nodes).toHaveLength(3);
  });

  it('lamp totals and operating-state counts are correct', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.summary.totalLamps).toBe(5);
    expect(model.summary.activeLamps).toBe(1);
    expect(model.summary.preLightLamps).toBe(1);
    expect(model.summary.standbyLamps).toBe(3);
    expect(model.summary.offLamps).toBe(0);
  });

  it('sensor totals and health counts use SensorHealth values', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.summary.totalSensors).toBe(6);
    expect(model.summary.healthySensors).toBe(6);
    expect(model.summary.warningSensors).toBe(0);
    expect(model.summary.faultSensors).toBe(0);
    expect(model.summary.unknownSensors).toBe(0);
  });

  it('active alert count and highest severity are correct', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.summary.activeAlerts).toBe(1);
    expect(model.summary.highestAlertSeverity).toBe(AlertSeverity.WARNING);
    expect(model.alerts).toHaveLength(1);
  });

  it('system mode, timestamp, and source are presentation-ready', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.systemMode).toBe(SystemMode.AUTO_ADAPTIVE);
    expect(model.snapshotAtLabel).toBe('2026-06-15 20:30 UTC');
    expect(model.dataSource).toBe(DataSource.SIMULATED);
  });

  it('maps canonical contract IDs to dashboard labels', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.nodes.map((node) => node.id)).toEqual(['NODE_1', 'NODE_2', 'NODE_3']);
    expect(model.lamps.map((lamp) => lamp.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    expect(model.sensors.map((sensor) => sensor.id)).toContain('BH1750');
  });

  it('preserves node lamp ownership without mutating contract IDs', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.nodes[0]?.lampIds).toEqual(['L1', 'L2']);
    expect(model.nodes[1]?.lampIds).toEqual(['L3']);
    expect(model.nodes[2]?.lampIds).toEqual(['L4', 'L5']);
    expect(model.nodes[0]?.contractId).toBe('node-1');
  });

  it('uses explicit simulated source and good quality for sensors', () => {
    const model = createOverviewModel(overviewSnapshot);

    expect(model.sensors.every((sensor) => sensor.dataSource === DataSource.SIMULATED)).toBe(true);
    expect(model.sensors.every((sensor) => sensor.metricQuality === MetricQuality.GOOD)).toBe(true);
    expect(model.sensors.find((sensor) => sensor.id === 'IR2')?.activityLabel).toBe('Active');
  });

  it('does not mutate the input snapshot', () => {
    const before = structuredClone(overviewSnapshot);

    createOverviewModel(overviewSnapshot);

    expect(overviewSnapshot).toEqual(before);
    expect(JSON.stringify(overviewSnapshot)).toBe(JSON.stringify(before));
  });

  it('produces the same JSON-compatible model for the same snapshot', () => {
    const first = createOverviewModel(overviewSnapshot);
    const second = createOverviewModel(overviewSnapshot);

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).not.toContain('undefined');
  });

  it('fixture is accepted by the shared SystemSnapshot schema', () => {
    expect(SystemSnapshotSchema.parse(overviewSnapshot)).toEqual(overviewSnapshot);
    expect(createValidatedOverviewModel(overviewSnapshot)).toEqual(
      createOverviewModel(overviewSnapshot),
    );
  });

  it('invalid fixtures fail before a UI model can be created', () => {
    expect(() => createValidatedOverviewModel({ snapshotAt: 'invalid' })).toThrow();
  });

  it('fixture and read-model contain no Date, function, or undefined values', () => {
    const model = createOverviewModel(overviewSnapshot);
    const serializedFixture = JSON.stringify(overviewSnapshot);
    const serializedModel = JSON.stringify(model);

    expect(serializedFixture).toBeTruthy();
    expect(serializedModel).toBeTruthy();
    expect(model.snapshotAt).toBeTypeOf('string');
    expect(serializedModel).not.toContain('undefined');
  });
});
