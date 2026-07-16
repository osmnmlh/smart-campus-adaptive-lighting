import {
  AlertSeverity,
  AlertStatus,
  CommunicationHealth,
  DataSource,
  DayPhase,
  Direction,
  EntityType,
  LampHealth,
  LampOperatingState,
  MetricQuality,
  NodeHealth,
  SensorHealth,
  SystemMode,
  SystemSnapshotSchema,
} from '@smart-campus/contracts';

const snapshotAt = '2026-06-15T20:30:00.000Z';

const simulatedMetric = (value: number, unit: 'BOOLEAN' | 'LX' | 'W' | 'Wh') => ({
  value,
  unit,
  source: DataSource.SIMULATED,
  observedAt: snapshotAt,
  quality: MetricQuality.GOOD,
});

const communication = {
  health: CommunicationHealth.HEALTHY,
  lastHeartbeatAt: snapshotAt,
  packetsSent: 240,
  packetsReceived: 240,
  packetsLost: 0,
  packetLossPercent: 0,
  averageLatencyMs: 18,
};

const lamp = (
  lampId: `lamp-${number}`,
  operatingState: LampOperatingState,
  brightnessPercent: number,
) => ({
  lampId,
  operatingState,
  health: LampHealth.HEALTHY,
  brightnessPercent,
  targetBrightnessPercent: brightnessPercent,
  pwmDutyPercent: brightnessPercent,
  electrical: {
    current: null,
    voltage: null,
    power: null,
    energy: simulatedMetric(0, 'Wh'),
  },
  fadeRemainingMs: 0,
  updatedAt: snapshotAt,
});

const sensor = (
  sensorId: `sensor-ir-${number}` | 'sensor-bh1750-1',
  active: boolean | undefined,
  value: number,
  unit: 'BOOLEAN' | 'LX',
) => ({
  sensorId,
  health: SensorHealth.HEALTHY,
  ...(active === undefined ? {} : { active }),
  reading: simulatedMetric(value, unit),
  lastChangedAt: snapshotAt,
});

export const overviewSnapshot = SystemSnapshotSchema.parse({
  schemaVersion: 1,
  snapshotAt,
  scenarioRunId: 'overview-fixture-1',
  systemMode: SystemMode.AUTO_ADAPTIVE,
  dayPhase: DayPhase.NIGHT,
  lux: simulatedMetric(184, 'LX'),
  direction: {
    direction: Direction.NONE,
    confidence: 100,
    confirmedBySensorIds: [],
    updatedAt: snapshotAt,
    source: DataSource.SIMULATED,
  },
  nodes: [
    {
      nodeId: 'node-1',
      health: NodeHealth.HEALTHY,
      online: true,
      uptimeMs: 8_640_000,
      communication: { ...communication },
      holdRemainingMs: 0,
    },
    {
      nodeId: 'node-2',
      health: NodeHealth.HEALTHY,
      online: true,
      uptimeMs: 8_580_000,
      communication: { ...communication },
      holdRemainingMs: 26_000,
    },
    {
      nodeId: 'node-3',
      health: NodeHealth.HEALTHY,
      online: true,
      uptimeMs: 8_520_000,
      communication: { ...communication },
      holdRemainingMs: 0,
    },
  ],
  lamps: [
    lamp('lamp-1', LampOperatingState.STANDBY, 30),
    lamp('lamp-2', LampOperatingState.ACTIVE, 100),
    lamp('lamp-3', LampOperatingState.PRE_LIGHT, 60),
    lamp('lamp-4', LampOperatingState.STANDBY, 30),
    lamp('lamp-5', LampOperatingState.STANDBY, 30),
  ],
  sensors: [
    sensor('sensor-ir-1', false, 0, 'BOOLEAN'),
    sensor('sensor-ir-2', true, 1, 'BOOLEAN'),
    sensor('sensor-ir-3', false, 0, 'BOOLEAN'),
    sensor('sensor-ir-4', false, 0, 'BOOLEAN'),
    sensor('sensor-ir-5', false, 0, 'BOOLEAN'),
    sensor('sensor-bh1750-1', undefined, 184, 'LX'),
  ],
  activeAlerts: [
    {
      id: 'alert-overview-1',
      code: 'DIRECTION_CONFIRMATION_TIMEOUT',
      status: AlertStatus.ACTIVE,
      severity: AlertSeverity.WARNING,
      sourceEntity: { entityType: EntityType.SENSOR, entityId: 'sensor-ir-1' },
      startedAt: '2026-06-15T20:29:30.000Z',
      lastObservedAt: snapshotAt,
      durationMs: 30_000,
      message: 'Yön doğrulama süresi aşıldı',
      probableCause: 'İkinci sensör sinyali mock zaman penceresinde oluşmadı.',
      recommendedAction: 'Scenario olay sırasını gözden geçirin.',
      metadata: { fixture: true },
    },
  ],
  recentEvents: [],
  instantPower: simulatedMetric(0, 'W'),
  energyConsumed: simulatedMetric(0, 'Wh'),
  baselineEnergy: simulatedMetric(0, 'Wh'),
  estimatedSavingPercent: null,
});
