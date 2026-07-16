import { DataSource, MetricQuality } from '@smart-campus/contracts';
import { describe, expect, it } from 'vitest';
import {
  createMetricsDashboardModel,
  createMetricsDashboardState,
} from '@/features/metrics/metrics-adapter';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';

describe('metrics fixture and adapter', () => {
  it('uses a fixed UTC range with 61 one-minute points', () => {
    expect(metricsTelemetryFixture.fixtureStart).toBe('2026-06-15T19:30:00.000Z');
    expect(metricsTelemetryFixture.fixtureEnd).toBe('2026-06-15T20:30:00.000Z');
    expect(metricsTelemetryFixture.lamps[0]?.points).toHaveLength(61);
    expect(metricsTelemetryFixture.ambientLight).toHaveLength(61);
    expect(metricsTelemetryFixture.sensors[0]?.points).toHaveLength(61);
    expect(
      Date.parse(metricsTelemetryFixture.fixtureEnd) -
        Date.parse(metricsTelemetryFixture.fixtureStart),
    ).toBe(60 * 60_000);
  });

  it('contains canonical lamps in stable order', () => {
    expect(metricsTelemetryFixture.lamps.map((series) => series.lampId)).toEqual([
      'lamp-1',
      'lamp-2',
      'lamp-3',
      'lamp-4',
      'lamp-5',
    ]);
    expect(metricsTelemetryFixture.lamps.map((series) => series.label)).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'L5',
    ]);
    expect(metricsTelemetryFixture.lamps.every((series) => series.points.length === 61)).toBe(true);
  });

  it('matches the Overview lamp state at the final point', () => {
    const latest = metricsTelemetryFixture.lamps.map((series) => series.points.at(-1));
    expect(latest.map((point) => point?.brightnessPercent)).toEqual([30, 100, 60, 30, 30]);
    expect(latest.map((point) => point?.targetBrightnessPercent)).toEqual([30, 100, 60, 30, 30]);
    expect(latest.map((point) => point?.pwmDutyPercent)).toEqual([30, 100, 60, 30, 30]);
  });

  it('contains IR1 through IR5 activity series', () => {
    expect(metricsTelemetryFixture.sensors.map((series) => series.sensorId)).toEqual([
      'sensor-ir-1',
      'sensor-ir-2',
      'sensor-ir-3',
      'sensor-ir-4',
      'sensor-ir-5',
    ]);
    expect(metricsTelemetryFixture.sensors.map((series) => series.label)).toEqual([
      'IR1',
      'IR2',
      'IR3',
      'IR4',
      'IR5',
    ]);
    expect(metricsTelemetryFixture.sensors[1]?.points.at(-1)?.value).toBe(1);
    expect(metricsTelemetryFixture.sensors[0]?.points.at(-1)?.value).toBe(0);
  });

  it('contains non-negative BH1750 ambient values', () => {
    expect(metricsTelemetryFixture.ambientLight.length).toBe(61);
    expect(metricsTelemetryFixture.ambientLight.every((point) => point.value >= 0)).toBe(true);
    expect(metricsTelemetryFixture.ambientLight.at(-1)?.value).toBe(184);
    expect(metricsTelemetryFixture.ambientLight.at(-1)?.unit).toBe('LX');
  });

  it('preserves simulated source and controlled quality values', () => {
    const lampPoints = metricsTelemetryFixture.lamps.flatMap((series) => series.points);
    const sensorPoints = metricsTelemetryFixture.sensors.flatMap((series) => series.points);
    const allPoints = [...lampPoints, ...metricsTelemetryFixture.ambientLight, ...sensorPoints];
    expect(allPoints.every((point) => point.source === DataSource.SIMULATED)).toBe(true);
    expect(allPoints.some((point) => point.quality === MetricQuality.STALE)).toBe(true);
    expect(allPoints.some((point) => point.quality === MetricQuality.INVALID)).toBe(true);
    expect(
      allPoints.filter((point) => point.quality === MetricQuality.GOOD).length,
    ).toBeGreaterThan(600);
  });

  it('exports JSON-compatible deterministic data', () => {
    const serialized = JSON.stringify(metricsTelemetryFixture);
    const parsed = JSON.parse(serialized) as unknown;
    expect(serialized).toBe(JSON.stringify(metricsTelemetryFixture));
    expect(parsed).toEqual(metricsTelemetryFixture);
    expect(serialized).not.toContain('undefined');
    expect(serialized).not.toContain('function');
    expect(metricsTelemetryFixture.fixtureStart).not.toBeInstanceOf(Date);
  });

  it('does not mutate fixture input', () => {
    const before = JSON.stringify(metricsTelemetryFixture);
    createMetricsDashboardModel(metricsTelemetryFixture);
    expect(JSON.stringify(metricsTelemetryFixture)).toBe(before);
  });

  it('produces the same read-model for the same fixture', () => {
    const first = createMetricsDashboardModel(metricsTelemetryFixture);
    const second = createMetricsDashboardModel(metricsTelemetryFixture);
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('keeps all percentages inside canonical bounds', () => {
    const points = createMetricsDashboardModel(metricsTelemetryFixture).lamps.flatMap(
      (series) => series.points,
    );
    expect(points.every((point) => point.brightnessPercent >= 0)).toBe(true);
    expect(points.every((point) => point.brightnessPercent <= 100)).toBe(true);
    expect(points.every((point) => point.targetBrightnessPercent <= 100)).toBe(true);
    expect(points.every((point) => point.pwmDutyPercent <= 100)).toBe(true);
  });

  it('maps communication status without invented radio metrics', () => {
    const model = createMetricsDashboardModel(metricsTelemetryFixture);
    expect(model.communication).toHaveLength(3);
    expect(model.communication.map((item) => item.label)).toEqual(['NODE_1', 'NODE_2', 'NODE_3']);
    expect(model.communication.every((item) => item.communicationHealth === 'HEALTHY')).toBe(true);
    expect(model.communication.every((item) => item.source === DataSource.SIMULATED)).toBe(true);
  });

  it('reports electrical telemetry as unavailable', () => {
    const model = createMetricsDashboardModel(metricsTelemetryFixture);
    expect(model.electricalAvailable).toBe(false);
    expect(model.dataSource).toBe(DataSource.SIMULATED);
  });

  it('returns a safe invalid state for an out-of-range percentage', () => {
    const invalidFixture = {
      ...metricsTelemetryFixture,
      lamps: metricsTelemetryFixture.lamps.map((series, seriesIndex) => ({
        ...series,
        points: series.points.map((point, pointIndex) =>
          seriesIndex === 0 && pointIndex === 0 ? { ...point, brightnessPercent: 101 } : point,
        ),
      })),
    };
    const state = createMetricsDashboardState(invalidFixture);
    expect(state.status).toBe('invalid');
    expect(state.model).toBeNull();
    expect(state.message).toContain('invalid');
    expect(state.message).not.toContain('Error:');
  });

  it('returns a ready state for the canonical fixture', () => {
    const state = createMetricsDashboardState(metricsTelemetryFixture);
    expect(state.status).toBe('ready');
    expect(state.model?.lamps).toHaveLength(5);
    expect(state.model?.sensors).toHaveLength(5);
    expect(state.message).toContain('ready');
  });
});
