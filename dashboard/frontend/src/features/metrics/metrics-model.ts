import type {
  CommunicationHealth,
  DataSource,
  MetricQuality,
  MetricUnit,
  NodeHealth,
  SystemSnapshot,
} from '@smart-campus/contracts';

export type TimeRange = '5m' | '15m' | '60m';
export type MetricsStatus = 'ready' | 'empty' | 'invalid';
export type LampMetricKey = 'brightnessPercent' | 'targetBrightnessPercent' | 'pwmDutyPercent';

export type MetricPoint = Readonly<{
  timestamp: string;
  value: number;
  unit: MetricUnit;
  source: DataSource;
  quality: MetricQuality;
}>;

export type LampTelemetryPoint = Readonly<{
  timestamp: string;
  brightnessPercent: number;
  targetBrightnessPercent: number;
  pwmDutyPercent: number;
  source: DataSource;
  quality: MetricQuality;
}>;

export type LampTelemetrySeries = Readonly<{
  lampId: string;
  label: string;
  points: readonly LampTelemetryPoint[];
}>;

export type SensorActivityPoint = Readonly<{
  timestamp: string;
  value: 0 | 1;
  source: DataSource;
  quality: MetricQuality;
}>;

export type SensorActivitySeries = Readonly<{
  sensorId: string;
  label: string;
  points: readonly SensorActivityPoint[];
}>;

export type MetricsTelemetryFixture = Readonly<{
  fixtureStart: string;
  fixtureEnd: string;
  snapshot: SystemSnapshot;
  lamps: readonly LampTelemetrySeries[];
  ambientLight: readonly MetricPoint[];
  sensors: readonly SensorActivitySeries[];
}>;

export type MetricSeries = Readonly<{
  key: LampMetricKey | 'ambientLight' | 'sensorActivity';
  label: string;
  unit: MetricUnit;
  points: readonly MetricPoint[];
}>;

export type MetricQualitySummary = Readonly<{
  good: number;
  stale: number;
  invalid: number;
  source: DataSource;
  latestTimestamp: string | null;
}>;

export type CommunicationStatusItem = Readonly<{
  nodeId: string;
  label: string;
  communicationHealth: CommunicationHealth;
  nodeHealth: NodeHealth;
  latestTimestamp: string;
  source: DataSource;
}>;

export type MetricsDashboardModel = Readonly<{
  fixtureStart: string;
  fixtureEnd: string;
  snapshotAt: string;
  dataSource: DataSource;
  lamps: readonly LampTelemetrySeries[];
  ambientLight: readonly MetricPoint[];
  sensors: readonly SensorActivitySeries[];
  communication: readonly CommunicationStatusItem[];
  electricalAvailable: boolean;
}>;

export type MetricsDashboardState = Readonly<{
  status: MetricsStatus;
  model: MetricsDashboardModel | null;
  message: string;
}>;

export type MetricsTableRow = Readonly<{
  id: string;
  timestamp: string;
  metric: string;
  value: number;
  unit: MetricUnit;
  source: DataSource;
  quality: MetricQuality;
}>;
