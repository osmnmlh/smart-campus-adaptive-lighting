import type {
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
} from '@smart-campus/contracts';

export type OverviewTone = 'ready' | 'pending' | 'neutral' | 'warning' | 'critical';

export type OverviewSummary = Readonly<{
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  totalLamps: number;
  activeLamps: number;
  preLightLamps: number;
  standbyLamps: number;
  offLamps: number;
  totalSensors: number;
  healthySensors: number;
  warningSensors: number;
  faultSensors: number;
  unknownSensors: number;
  activeAlerts: number;
  highestAlertSeverity: AlertSeverity | 'NONE';
}>;

export type OverviewNode = Readonly<{
  id: string;
  contractId: string;
  health: NodeHealth;
  healthLabel: string;
  healthTone: OverviewTone;
  online: boolean;
  communicationHealth: CommunicationHealth;
  communicationLabel: string;
  communicationTone: OverviewTone;
  lampIds: readonly string[];
  updatedAt: string;
  updatedAtLabel: string;
}>;

export type OverviewLamp = Readonly<{
  id: string;
  contractId: string;
  operatingState: LampOperatingState;
  operatingStateLabel: string;
  operatingStateTone: OverviewTone;
  health: LampHealth;
  healthLabel: string;
  healthTone: OverviewTone;
  brightnessPercent: number;
  targetBrightnessPercent: number;
  pwmDutyPercent: number;
}>;

export type OverviewSensor = Readonly<{
  id: string;
  contractId: string;
  type: SensorType;
  typeLabel: string;
  health: SensorHealth;
  healthLabel: string;
  healthTone: OverviewTone;
  active: boolean | null;
  activityLabel: string;
  dataSource: DataSource;
  dataSourceLabel: string;
  metricQuality: MetricQuality;
  metricQualityLabel: string;
}>;

export type OverviewAlert = Readonly<{
  id: string;
  title: string;
  severity: AlertSeverity;
  severityLabel: string;
  severityTone: OverviewTone;
  entityReference: string;
  timestamp: string;
  timestampLabel: string;
}>;

export type OverviewModel = Readonly<{
  systemMode: SystemMode;
  systemModeLabel: string;
  systemModeTone: OverviewTone;
  snapshotAt: string;
  snapshotAtLabel: string;
  dataSource: DataSource;
  dataSourceLabel: string;
  summary: OverviewSummary;
  nodes: readonly OverviewNode[];
  lamps: readonly OverviewLamp[];
  sensors: readonly OverviewSensor[];
  alerts: readonly OverviewAlert[];
}>;
