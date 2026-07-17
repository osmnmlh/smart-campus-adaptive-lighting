import { MetricQuality } from '@smart-campus/contracts';
import { describe, expect, it } from 'vitest';
import { createMetricsDashboardModel } from '@/features/metrics/metrics-adapter';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';
import {
  ambientMetricSeries,
  filterMetricPoints,
  hasNonGoodPoints,
  lampMetricSeries,
  latestMetricPoint,
  metricQualitySummary,
  metricsTableRows,
  nodeCommunicationStatuses,
  selectedMetricPoints,
  sensorActivityMetricSeries,
} from '@/features/metrics/metrics-selectors';

const model = createMetricsDashboardModel(metricsTelemetryFixture);

describe('metrics selectors', () => {
  it('filters deterministic 5, 15, and 60 minute windows', () => {
    expect(filterMetricPoints(model.ambientLight, '5m', model.fixtureEnd)).toHaveLength(6);
    expect(filterMetricPoints(model.ambientLight, '15m', model.fixtureEnd)).toHaveLength(16);
    expect(filterMetricPoints(model.ambientLight, '60m', model.fixtureEnd)).toHaveLength(61);
  });

  it('includes the final fixture point in every window', () => {
    expect(filterMetricPoints(model.ambientLight, '5m', model.fixtureEnd).at(-1)?.timestamp).toBe(
      model.fixtureEnd,
    );
    expect(filterMetricPoints(model.ambientLight, '15m', model.fixtureEnd).at(-1)?.timestamp).toBe(
      model.fixtureEnd,
    );
    expect(filterMetricPoints(model.ambientLight, '60m', model.fixtureEnd).at(-1)?.timestamp).toBe(
      model.fixtureEnd,
    );
  });

  it('does not mutate inputs while filtering', () => {
    const before = JSON.stringify(model.ambientLight);
    const result = filterMetricPoints(model.ambientLight, '15m', model.fixtureEnd);
    expect(JSON.stringify(model.ambientLight)).toBe(before);
    expect(result).not.toBe(model.ambientLight);
  });

  it('safely rejects an unknown time range', () => {
    expect(filterMetricPoints(model.ambientLight, '24h', model.fixtureEnd)).toEqual([]);
  });

  it('selects L1 through L5 without changing series order', () => {
    for (const lampId of ['lamp-1', 'lamp-2', 'lamp-3', 'lamp-4', 'lamp-5']) {
      const series = lampMetricSeries(model, lampId, '5m');
      expect(series).toHaveLength(3);
      expect(series.map((item) => item.key)).toEqual([
        'brightnessPercent',
        'targetBrightnessPercent',
        'pwmDutyPercent',
      ]);
      expect(series.every((item) => item.points.length === 6)).toBe(true);
    }
  });

  it('returns no lamp series for an unknown lamp', () => {
    expect(lampMetricSeries(model, 'lamp-99', '5m')).toEqual([]);
  });

  it('selects IR2 activity with binary values', () => {
    const series = sensorActivityMetricSeries(model, 'sensor-ir-2', '15m');
    expect(series?.label).toBe('IR2 Activity');
    expect(series?.points).toHaveLength(16);
    expect(series?.points.every((point) => point.value === 0 || point.value === 1)).toBe(true);
    expect(series?.points.at(-1)?.value).toBe(1);
  });

  it('does not label IR3 activity as direction', () => {
    const series = sensorActivityMetricSeries(model, 'sensor-ir-3', '60m');
    expect(series?.label).toBe('IR3 Activity');
    expect(series?.label.toLowerCase()).not.toContain('direction');
  });

  it('returns null for an unknown sensor', () => {
    expect(sensorActivityMetricSeries(model, 'sensor-ir-99', '5m')).toBeNull();
  });

  it('selects ambient light and latest metric safely', () => {
    const ambient = ambientMetricSeries(model, '5m');
    expect(ambient.points).toHaveLength(6);
    expect(ambient.unit).toBe('LX');
    expect(latestMetricPoint(ambient.points)?.value).toBe(184);
    expect(latestMetricPoint([])).toBeNull();
  });

  it('counts GOOD, STALE, and INVALID selected points', () => {
    const lamps = lampMetricSeries(model, 'lamp-2', '5m');
    const ambient = ambientMetricSeries(model, '5m');
    const sensor = sensorActivityMetricSeries(model, 'sensor-ir-2', '5m');
    const points = selectedMetricPoints(lamps, ambient, sensor);
    const summary = metricQualitySummary(points);
    expect(points).toHaveLength(30);
    expect(summary.good).toBe(25);
    expect(summary.stale).toBe(4);
    expect(summary.invalid).toBe(1);
    expect(summary.latestTimestamp).toBe(model.fixtureEnd);
    expect(hasNonGoodPoints(points)).toBe(true);
    expect(points.some((point) => point.quality === MetricQuality.INVALID)).toBe(true);
  });

  it('creates newest-first synchronized accessible rows', () => {
    const lamps = lampMetricSeries(model, 'lamp-2', '5m');
    const ambient = ambientMetricSeries(model, '5m');
    const sensor = sensorActivityMetricSeries(model, 'sensor-ir-2', '5m');
    const rows = metricsTableRows(lamps, ambient, sensor);
    expect(rows).toHaveLength(30);
    expect(rows[0]?.timestamp).toBe(model.fixtureEnd);
    expect(rows.some((row) => row.quality === MetricQuality.INVALID)).toBe(true);
    expect(rows.some((row) => row.quality === MetricQuality.STALE)).toBe(true);
    expect(rows.every((row) => row.source === 'SIMULATED')).toBe(true);
  });

  it('returns stable communication status order', () => {
    const items = nodeCommunicationStatuses(model);
    expect(items.map((item) => item.label)).toEqual(['NODE_1', 'NODE_2', 'NODE_3']);
    expect(items.every((item) => item.communicationHealth === 'HEALTHY')).toBe(true);
    expect(items.every((item) => item.nodeHealth === 'HEALTHY')).toBe(true);
  });
});
