export const timestamp = '2026-01-01T00:00:00.000Z';

export const metric = (value: number, unit: string) => ({
  value,
  unit,
  source: 'SIMULATED',
  observedAt: timestamp,
  quality: 'GOOD',
});

export const electricalMetrics = {
  current: metric(0.2, 'A'),
  voltage: metric(12, 'V'),
  power: metric(2.4, 'W'),
  energy: metric(0.04, 'Wh'),
};

export const nodeSnapshot = {
  nodeId: 'node-1',
  health: 'HEALTHY',
  online: true,
  firmwareVersion: '0.1.0',
  uptimeMs: 10_000,
  communication: {
    health: 'HEALTHY',
    lastHeartbeatAt: timestamp,
    packetsSent: 10,
    packetsReceived: 10,
    packetsLost: 0,
    packetLossPercent: 0,
    averageLatencyMs: 4,
  },
  holdRemainingMs: 0,
};

export const lampSnapshot = {
  lampId: 'lamp-1',
  operatingState: 'STANDBY',
  health: 'HEALTHY',
  brightnessPercent: 30,
  targetBrightnessPercent: 30,
  pwmDutyPercent: 30,
  electrical: electricalMetrics,
  fadeRemainingMs: 0,
  updatedAt: timestamp,
};

export const sensorSnapshot = {
  sensorId: 'sensor-ir-1',
  health: 'HEALTHY',
  active: false,
  lastChangedAt: timestamp,
};

export const systemSnapshot = {
  schemaVersion: 1,
  snapshotAt: timestamp,
  scenarioRunId: 'healthy-night-run',
  systemMode: 'AUTO_ADAPTIVE',
  dayPhase: 'NIGHT',
  lux: metric(20, 'LX'),
  direction: {
    direction: 'NONE',
    confidence: 0,
    confirmedBySensorIds: [],
    updatedAt: timestamp,
    source: 'SIMULATED',
  },
  nodes: [nodeSnapshot],
  lamps: [lampSnapshot],
  sensors: [sensorSnapshot],
  activeAlerts: [],
  recentEvents: [],
  instantPower: metric(2.4, 'W'),
  energyConsumed: metric(0.04, 'Wh'),
  baselineEnergy: metric(0.12, 'Wh'),
  estimatedSavingPercent: metric(66.67, 'PERCENT'),
};

export const commandBase = {
  commandId: 'command-1',
  issuedAt: timestamp,
  actorId: 'local-operator',
  correlationId: 'correlation-1',
};
