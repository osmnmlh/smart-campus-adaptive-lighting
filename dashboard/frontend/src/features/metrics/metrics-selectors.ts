import { DataSource, MetricQuality, MetricUnit } from '@smart-campus/contracts';
import type {
  LampMetricKey,
  MetricPoint,
  MetricQualitySummary,
  MetricSeries,
  MetricsDashboardModel,
  MetricsTableRow,
  SensorActivitySeries,
  TimeRange,
} from './metrics-model';

const timeRangeMinutes: Record<TimeRange, number> = {
  '5m': 5,
  '15m': 15,
  '60m': 60,
};

const lampMetrics: readonly Readonly<{
  key: LampMetricKey;
  label: string;
}>[] = [
  { key: 'brightnessPercent', label: 'Brightness' },
  { key: 'targetBrightnessPercent', label: 'Target Brightness' },
  { key: 'pwmDutyPercent', label: 'PWM Duty Percent (pwmDutyPercent)' },
];

export function isTimeRange(value: string): value is TimeRange {
  return value === '5m' || value === '15m' || value === '60m';
}

export function filterMetricPoints<T extends { timestamp: string }>(
  points: readonly T[],
  range: string,
  fixtureEnd: string,
): readonly T[] {
  if (!isTimeRange(range)) return [];
  const end = Date.parse(fixtureEnd);
  const start = end - timeRangeMinutes[range] * 60_000;
  return points.filter((point) => {
    const timestamp = Date.parse(point.timestamp);
    return timestamp >= start && timestamp <= end;
  });
}

export function lampMetricSeries(
  model: MetricsDashboardModel,
  lampId: string,
  range: string,
): readonly MetricSeries[] {
  const lamp = model.lamps.find((series) => series.lampId === lampId);
  if (!lamp) return [];
  const points = filterMetricPoints(lamp.points, range, model.fixtureEnd);
  return lampMetrics.map(({ key, label }) => ({
    key,
    label,
    unit: MetricUnit.PERCENT,
    points: points.map((point) => ({
      timestamp: point.timestamp,
      value: point[key],
      unit: MetricUnit.PERCENT,
      source: point.source,
      quality: point.quality,
    })),
  }));
}

export function ambientMetricSeries(model: MetricsDashboardModel, range: string): MetricSeries {
  return {
    key: 'ambientLight',
    label: 'Ambient Light',
    unit: MetricUnit.LX,
    points: filterMetricPoints(model.ambientLight, range, model.fixtureEnd).map((point) => ({
      ...point,
    })),
  };
}

export function sensorActivityMetricSeries(
  model: MetricsDashboardModel,
  sensorId: string,
  range: string,
): MetricSeries | null {
  const sensor = model.sensors.find((series) => series.sensorId === sensorId);
  if (!sensor) return null;
  return {
    key: 'sensorActivity',
    label: `${sensor.label} Activity`,
    unit: MetricUnit.BOOLEAN,
    points: filterMetricPoints(sensor.points, range, model.fixtureEnd).map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
      unit: MetricUnit.BOOLEAN,
      source: point.source,
      quality: point.quality,
    })),
  };
}

export function latestMetricPoint(points: readonly MetricPoint[]): MetricPoint | null {
  return points.at(-1) ?? null;
}

export function metricQualitySummary(points: readonly MetricPoint[]): MetricQualitySummary {
  return {
    good: points.filter((point) => point.quality === MetricQuality.GOOD).length,
    stale: points.filter((point) => point.quality === MetricQuality.STALE).length,
    invalid: points.filter((point) => point.quality === MetricQuality.INVALID).length,
    source: points.at(-1)?.source ?? DataSource.SIMULATED,
    latestTimestamp: points.at(-1)?.timestamp ?? null,
  };
}

export function hasNonGoodPoints(points: readonly MetricPoint[]): boolean {
  return points.some((point) => point.quality !== MetricQuality.GOOD);
}

export function nodeCommunicationStatuses(model: MetricsDashboardModel) {
  return model.communication.map((item) => ({ ...item }));
}

export function selectedMetricPoints(
  lampSeries: readonly MetricSeries[],
  ambientSeries: MetricSeries,
  sensorSeries: MetricSeries | null,
): readonly MetricPoint[] {
  return [
    ...lampSeries.flatMap((series) => series.points),
    ...ambientSeries.points,
    ...(sensorSeries?.points ?? []),
  ];
}

export function metricsTableRows(
  lampSeries: readonly MetricSeries[],
  ambientSeries: MetricSeries,
  sensorSeries: MetricSeries | null,
  limit = 36,
): readonly MetricsTableRow[] {
  const series = [...lampSeries, ambientSeries, ...(sensorSeries ? [sensorSeries] : [])];
  return series
    .flatMap((item) =>
      item.points.map((point) => ({
        id: `${item.key}:${point.timestamp}`,
        timestamp: point.timestamp,
        metric: item.label,
        value: point.value,
        unit: point.unit,
        source: point.source,
        quality: point.quality,
      })),
    )
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, limit);
}

export function sensorSeriesById(
  model: MetricsDashboardModel,
  sensorId: string,
): SensorActivitySeries | null {
  return model.sensors.find((series) => series.sensorId === sensorId) ?? null;
}
