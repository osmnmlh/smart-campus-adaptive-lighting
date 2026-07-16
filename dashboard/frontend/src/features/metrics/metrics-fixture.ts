import {
  DataSource,
  MetricQuality,
  MetricUnit,
  SystemSnapshotSchema,
} from '@smart-campus/contracts';
import type {
  LampTelemetryPoint,
  MetricsTelemetryFixture,
  SensorActivityPoint,
} from './metrics-model';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

const fixtureStart = '2026-06-15T19:30:00.000Z';
const fixtureEnd = '2026-06-15T20:30:00.000Z';
const pointIndexes = Array.from({ length: 61 }, (_, index) => index);

function timestampFor(index: number): string {
  const totalMinutes = 19 * 60 + 30 + index;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `2026-06-15T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

function brightnessFor(lampNumber: number, index: number): number {
  if (lampNumber === 1) return index >= 22 && index < 36 ? 60 : 30;
  if (lampNumber === 2) return index < 30 ? 30 : index < 50 ? 60 : 100;
  if (lampNumber === 3) return index < 42 ? 30 : 60;
  if (lampNumber === 4) return index >= 18 && index < 28 ? 60 : 30;
  return index >= 8 && index < 18 ? 60 : 30;
}

function targetFor(lampNumber: number, index: number): number {
  if (lampNumber === 2 && index === 29) return 60;
  if (lampNumber === 2 && index === 49) return 100;
  if (lampNumber === 3 && index === 41) return 60;
  return brightnessFor(lampNumber, index);
}

function lampPoint(lampNumber: number, index: number): LampTelemetryPoint {
  const brightnessPercent = brightnessFor(lampNumber, index);
  return {
    timestamp: timestampFor(index),
    brightnessPercent,
    targetBrightnessPercent: targetFor(lampNumber, index),
    pwmDutyPercent: brightnessPercent,
    source: DataSource.SIMULATED,
    quality: lampNumber === 2 && index === 56 ? MetricQuality.STALE : MetricQuality.GOOD,
  };
}

function sensorValue(sensorNumber: number, index: number): 0 | 1 {
  if (sensorNumber === 1) return index >= 10 && index <= 12 ? 1 : 0;
  if (sensorNumber === 2) return index >= 55 ? 1 : 0;
  if (sensorNumber === 3) return index >= 34 && index <= 36 ? 1 : 0;
  if (sensorNumber === 4) return index >= 20 && index <= 22 ? 1 : 0;
  return index >= 5 && index <= 7 ? 1 : 0;
}

function sensorPoint(sensorNumber: number, index: number): SensorActivityPoint {
  return {
    timestamp: timestampFor(index),
    value: sensorValue(sensorNumber, index),
    source: DataSource.SIMULATED,
    quality: sensorNumber === 2 && index === 58 ? MetricQuality.INVALID : MetricQuality.GOOD,
  };
}

export const metricsTelemetryFixture: MetricsTelemetryFixture = {
  fixtureStart,
  fixtureEnd,
  snapshot: SystemSnapshotSchema.parse(overviewSnapshot),
  lamps: pointIndexes.slice(0, 5).map((_, lampIndex) => {
    const lampNumber = lampIndex + 1;
    return {
      lampId: `lamp-${lampNumber}`,
      label: `L${lampNumber}`,
      points: pointIndexes.map((index) => lampPoint(lampNumber, index)),
    };
  }),
  ambientLight: pointIndexes.map((index) => ({
    timestamp: timestampFor(index),
    value: 244 - index + (index % 5),
    unit: MetricUnit.LX,
    source: DataSource.SIMULATED,
    quality: index === 57 ? MetricQuality.STALE : MetricQuality.GOOD,
  })),
  sensors: pointIndexes.slice(0, 5).map((_, sensorIndex) => {
    const sensorNumber = sensorIndex + 1;
    return {
      sensorId: `sensor-ir-${sensorNumber}`,
      label: `IR${sensorNumber}`,
      points: pointIndexes.map((index) => sensorPoint(sensorNumber, index)),
    };
  }),
};
