import {
  DataSource,
  MetricQualitySchema,
  NonNegativeNumberSchema,
  PercentageSchema,
  SystemSnapshotSchema,
  UtcTimestampSchema,
} from '@smart-campus/contracts';
import type {
  LampTelemetryPoint,
  LampTelemetrySeries,
  MetricPoint,
  MetricsDashboardModel,
  MetricsDashboardState,
  MetricsTelemetryFixture,
  SensorActivityPoint,
  SensorActivitySeries,
} from './metrics-model';
import { displayEntityId } from '@/features/overview/overview-selectors';

const lampIds = ['lamp-1', 'lamp-2', 'lamp-3', 'lamp-4', 'lamp-5'] as const;
const sensorIds = [
  'sensor-ir-1',
  'sensor-ir-2',
  'sensor-ir-3',
  'sensor-ir-4',
  'sensor-ir-5',
] as const;

function assertOrderedTimestamps(points: readonly { timestamp: string }[]): void {
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (previous && current && previous.timestamp > current.timestamp) {
      throw new Error('Metric timestamps must be sorted in ascending UTC order.');
    }
  }
}

function cloneLampPoint(point: LampTelemetryPoint): LampTelemetryPoint {
  return {
    timestamp: UtcTimestampSchema.parse(point.timestamp),
    brightnessPercent: PercentageSchema.parse(point.brightnessPercent),
    targetBrightnessPercent: PercentageSchema.parse(point.targetBrightnessPercent),
    pwmDutyPercent: PercentageSchema.parse(point.pwmDutyPercent),
    source: point.source,
    quality: MetricQualitySchema.parse(point.quality),
  };
}

function cloneMetricPoint(point: MetricPoint): MetricPoint {
  return {
    timestamp: UtcTimestampSchema.parse(point.timestamp),
    value: NonNegativeNumberSchema.parse(point.value),
    unit: point.unit,
    source: point.source,
    quality: MetricQualitySchema.parse(point.quality),
  };
}

function cloneSensorPoint(point: SensorActivityPoint): SensorActivityPoint {
  if (point.value !== 0 && point.value !== 1) {
    throw new Error('Sensor activity values must be 0 or 1.');
  }
  return {
    timestamp: UtcTimestampSchema.parse(point.timestamp),
    value: point.value,
    source: point.source,
    quality: MetricQualitySchema.parse(point.quality),
  };
}

function requireSimulated(
  source: MetricsTelemetryFixture['lamps'][number]['points'][number]['source'],
) {
  if (source !== DataSource.SIMULATED) {
    throw new Error('Metrics fixture must use SIMULATED data only.');
  }
  return source;
}

function lampSeries(fixture: MetricsTelemetryFixture): readonly LampTelemetrySeries[] {
  return lampIds.map((lampId) => {
    const series = fixture.lamps.find((candidate) => candidate.lampId === lampId);
    if (!series) throw new Error(`Missing lamp telemetry series: ${lampId}`);
    const points = series.points.map((point) => {
      requireSimulated(point.source);
      return cloneLampPoint(point);
    });
    assertOrderedTimestamps(points);
    return { lampId, label: displayEntityId(lampId), points };
  });
}

function sensorSeries(fixture: MetricsTelemetryFixture): readonly SensorActivitySeries[] {
  return sensorIds.map((sensorId) => {
    const series = fixture.sensors.find((candidate) => candidate.sensorId === sensorId);
    if (!series) throw new Error(`Missing sensor telemetry series: ${sensorId}`);
    const points = series.points.map((point) => {
      requireSimulated(point.source);
      return cloneSensorPoint(point);
    });
    assertOrderedTimestamps(points);
    return { sensorId, label: displayEntityId(sensorId), points };
  });
}

export function createMetricsDashboardModel(
  fixture: MetricsTelemetryFixture,
): MetricsDashboardModel {
  const snapshot = SystemSnapshotSchema.parse(fixture.snapshot);
  const ambientLight = fixture.ambientLight.map((point) => {
    requireSimulated(point.source);
    return cloneMetricPoint(point);
  });
  assertOrderedTimestamps(ambientLight);

  return {
    fixtureStart: UtcTimestampSchema.parse(fixture.fixtureStart),
    fixtureEnd: UtcTimestampSchema.parse(fixture.fixtureEnd),
    snapshotAt: snapshot.snapshotAt,
    dataSource: DataSource.SIMULATED,
    lamps: lampSeries(fixture),
    ambientLight,
    sensors: sensorSeries(fixture),
    communication: [...snapshot.nodes]
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
      .map((node) => ({
        nodeId: node.nodeId,
        label: displayEntityId(node.nodeId),
        communicationHealth: node.communication.health,
        nodeHealth: node.health,
        latestTimestamp: node.communication.lastHeartbeatAt ?? snapshot.snapshotAt,
        source: DataSource.SIMULATED,
      })),
    electricalAvailable: snapshot.lamps.some(
      (lamp) =>
        lamp.electrical.current !== null ||
        lamp.electrical.voltage !== null ||
        lamp.electrical.power !== null,
    ),
  };
}

export function createMetricsDashboardState(input: MetricsTelemetryFixture): MetricsDashboardState {
  try {
    const model = createMetricsDashboardModel(input);
    const empty =
      model.lamps.every((series) => series.points.length === 0) &&
      model.ambientLight.length === 0 &&
      model.sensors.every((series) => series.points.length === 0);
    return {
      status: empty ? 'empty' : 'ready',
      model,
      message: empty
        ? 'No simulated metric points are available for this fixture.'
        : 'Deterministic simulated telemetry is ready.',
    };
  } catch {
    return {
      status: 'invalid',
      model: null,
      message: 'The simulated metrics fixture is invalid and cannot be displayed safely.',
    };
  }
}
