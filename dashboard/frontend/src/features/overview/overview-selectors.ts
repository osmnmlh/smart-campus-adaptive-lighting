import {
  AlertSeverity,
  CommunicationHealth,
  DataSource,
  LampHealth,
  LampOperatingState,
  MetricQuality,
  NodeHealth,
  SensorHealth,
  SensorType,
  SystemMode,
  type SystemSnapshot,
} from '@smart-campus/contracts';
import type { OverviewTone } from './overview-model';

const systemModeLabels: Record<SystemMode, string> = {
  [SystemMode.AUTO_ADAPTIVE]: 'Auto adaptive',
  [SystemMode.SCHEDULED]: 'Scheduled',
  [SystemMode.MANUAL]: 'Manual',
  [SystemMode.MAINTENANCE]: 'Maintenance',
  [SystemMode.FAIL_SAFE]: 'Fail-safe',
};

const nodeHealthLabels: Record<NodeHealth, string> = {
  [NodeHealth.HEALTHY]: 'Healthy',
  [NodeHealth.WARNING]: 'Warning',
  [NodeHealth.CRITICAL]: 'Critical',
  [NodeHealth.OFFLINE]: 'Offline',
  [NodeHealth.MAINTENANCE]: 'Maintenance',
  [NodeHealth.UNKNOWN]: 'Unknown',
};

const communicationLabels: Record<CommunicationHealth, string> = {
  [CommunicationHealth.HEALTHY]: 'Healthy',
  [CommunicationHealth.DEGRADED]: 'Degraded',
  [CommunicationHealth.LOST]: 'Lost',
  [CommunicationHealth.UNKNOWN]: 'Unknown',
};

const lampStateLabels: Record<LampOperatingState, string> = {
  [LampOperatingState.OFF]: 'Off',
  [LampOperatingState.STANDBY]: 'Standby',
  [LampOperatingState.PRE_LIGHT]: 'Pre-light',
  [LampOperatingState.ACTIVE]: 'Active',
  [LampOperatingState.FADING]: 'Fading',
};

const lampHealthLabels: Record<LampHealth, string> = {
  [LampHealth.HEALTHY]: 'Healthy',
  [LampHealth.WARNING]: 'Warning',
  [LampHealth.FAULT]: 'Fault',
  [LampHealth.MAINTENANCE]: 'Maintenance',
  [LampHealth.UNKNOWN]: 'Unknown',
};

const sensorHealthLabels: Record<SensorHealth, string> = {
  [SensorHealth.HEALTHY]: 'Healthy',
  [SensorHealth.WARNING]: 'Warning',
  [SensorHealth.FAULT]: 'Fault',
  [SensorHealth.UNKNOWN]: 'Unknown',
};

const sensorTypeLabels: Record<SensorType, string> = {
  [SensorType.IR]: 'Infrared motion',
  [SensorType.BH1750]: 'Ambient light',
  [SensorType.INA219]: 'Electrical telemetry',
};

const dataSourceLabels: Record<DataSource, string> = {
  [DataSource.MEASURED]: 'Measured',
  [DataSource.CALCULATED]: 'Calculated',
  [DataSource.ESTIMATED]: 'Estimated',
  [DataSource.SIMULATED]: 'Simulated',
  [DataSource.NOMINAL]: 'Nominal',
};

const metricQualityLabels: Record<MetricQuality, string> = {
  [MetricQuality.GOOD]: 'Good',
  [MetricQuality.STALE]: 'Stale',
  [MetricQuality.INVALID]: 'Invalid',
};

const severityLabels: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: 'Info',
  [AlertSeverity.WARNING]: 'Warning',
  [AlertSeverity.CRITICAL]: 'Critical',
  [AlertSeverity.EMERGENCY]: 'Emergency',
};

export const severityRank: Record<AlertSeverity, number> = {
  [AlertSeverity.INFO]: 1,
  [AlertSeverity.WARNING]: 2,
  [AlertSeverity.CRITICAL]: 3,
  [AlertSeverity.EMERGENCY]: 4,
};

const nodeLampOwnership: Readonly<Record<string, readonly string[]>> = {
  'node-1': ['lamp-1', 'lamp-2'],
  'node-2': ['lamp-3'],
  'node-3': ['lamp-4', 'lamp-5'],
};

const sensorTypes: Readonly<Record<string, SensorType>> = {
  'sensor-ir-1': SensorType.IR,
  'sensor-ir-2': SensorType.IR,
  'sensor-ir-3': SensorType.IR,
  'sensor-ir-4': SensorType.IR,
  'sensor-ir-5': SensorType.IR,
  'sensor-bh1750-1': SensorType.BH1750,
};

export const systemModeLabel = (value: SystemMode) => systemModeLabels[value];
export const nodeHealthLabel = (value: NodeHealth) => nodeHealthLabels[value];
export const communicationHealthLabel = (value: CommunicationHealth) => communicationLabels[value];
export const lampOperatingStateLabel = (value: LampOperatingState) => lampStateLabels[value];
export const lampHealthLabel = (value: LampHealth) => lampHealthLabels[value];
export const sensorHealthLabel = (value: SensorHealth) => sensorHealthLabels[value];
export const sensorTypeLabel = (value: SensorType) => sensorTypeLabels[value];
export const dataSourceLabel = (value: DataSource) => dataSourceLabels[value];
export const metricQualityLabel = (value: MetricQuality) => metricQualityLabels[value];
export const alertSeverityLabel = (value: AlertSeverity) => severityLabels[value];

export function formatUtcTimestamp(value: string): string {
  return `${value.slice(0, 10)} ${value.slice(11, 16)} UTC`;
}

export function displayEntityId(value: string): string {
  const nodeMatch = /^node-(\d+)$/.exec(value);
  if (nodeMatch) return `NODE_${nodeMatch[1]}`;

  const lampMatch = /^lamp-(\d+)$/.exec(value);
  if (lampMatch) return `L${lampMatch[1]}`;

  const infraredMatch = /^sensor-ir-(\d+)$/.exec(value);
  if (infraredMatch) return `IR${infraredMatch[1]}`;

  if (/^sensor-bh1750-\d+$/.test(value)) return 'BH1750';
  return value;
}

export function lampIdsForNode(nodeId: string, snapshot: SystemSnapshot): readonly string[] {
  const availableLampIds = new Set(snapshot.lamps.map((lamp) => lamp.lampId));
  return (nodeLampOwnership[nodeId] ?? [])
    .filter((lampId) => availableLampIds.has(lampId))
    .map(displayEntityId);
}

export function sensorTypeFor(sensorId: string): SensorType {
  const type = sensorTypes[sensorId];
  if (!type) throw new Error(`Unsupported overview sensor: ${sensorId}`);
  return type;
}

export function healthTone(value: string): OverviewTone {
  if (value === 'HEALTHY' || value === 'ACTIVE' || value === 'AUTO_ADAPTIVE') return 'ready';
  if (value === 'WARNING' || value === 'DEGRADED' || value === 'PRE_LIGHT') return 'warning';
  if (value === 'CRITICAL' || value === 'EMERGENCY' || value === 'FAULT' || value === 'LOST') {
    return 'critical';
  }
  if (value === 'OFFLINE') return 'critical';
  if (value === 'UNKNOWN') return 'pending';
  return 'neutral';
}
