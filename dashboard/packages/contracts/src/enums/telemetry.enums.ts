import { z } from 'zod';

export const DataSourceSchema = z.enum([
  'MEASURED',
  'CALCULATED',
  'ESTIMATED',
  'SIMULATED',
  'NOMINAL',
]);
export const DataSource = DataSourceSchema.enum;
export type DataSource = z.infer<typeof DataSourceSchema>;

export const MetricQualitySchema = z.enum(['GOOD', 'STALE', 'INVALID']);
export const MetricQuality = MetricQualitySchema.enum;
export type MetricQuality = z.infer<typeof MetricQualitySchema>;

export const SensorTypeSchema = z.enum(['IR', 'BH1750', 'INA219']);
export const SensorType = SensorTypeSchema.enum;
export type SensorType = z.infer<typeof SensorTypeSchema>;

export const MetricUnitSchema = z.enum([
  'A',
  'V',
  'W',
  'Wh',
  'PERCENT',
  'LX',
  'MS',
  'DBM',
  'COUNT',
  'BYTES',
  'BOOLEAN',
  'NONE',
]);
export const MetricUnit = MetricUnitSchema.enum;
export type MetricUnit = z.infer<typeof MetricUnitSchema>;

export const TelemetryMetricSchema = z.enum([
  'CURRENT',
  'VOLTAGE',
  'POWER',
  'ENERGY',
  'BRIGHTNESS',
  'LUX',
  'SENSOR_ACTIVE',
  'PACKET_LOSS',
  'LATENCY',
  'RSSI',
  'UPTIME',
  'FREE_HEAP',
]);
export const TelemetryMetric = TelemetryMetricSchema.enum;
export type TelemetryMetric = z.infer<typeof TelemetryMetricSchema>;
