import {
  AlertSeverity,
  AlertStatus,
  CommunicationHealth,
  DataSource,
  DayPhase,
  EventType,
  LampHealth,
  MetricQuality,
  NodeHealth,
  SensorHealth,
  type EventLog,
  type ScenarioEvent,
} from '@smart-campus/contracts';

import {
  CANONICAL_LAMP_IDS,
  MOCK_BRIGHTNESS_TIMING,
  calculateBrightnessPolicy,
  calculatePresenceLevels,
  type CanonicalLampId,
} from './brightness-policy.js';
import { detectDirection } from './direction-detector.js';
import { SENSOR_LAMP_OWNERSHIP, cloneScenarioState, type ScenarioState } from './scenario-state.js';

export const MOCK_DAYLIGHT_LUX_THRESHOLD = 100;

const systemSource = { entityType: 'SYSTEM' as const, entityId: 'SYSTEM' };

const appendEvent = (
  state: ScenarioState,
  timestamp: string,
  eventType: EventLog['eventType'],
  message: string,
  severity: EventLog['severity'] = AlertSeverity.INFO,
  metadata: EventLog['metadata'] = {},
): void => {
  state.eventSequence += 1;
  state.recentEvents.push({
    id: `${state.scenarioId}-event-${String(state.eventSequence).padStart(4, '0')}`,
    timestamp,
    source: systemSource,
    eventType,
    severity,
    message,
    metadata,
    scenarioRunId: state.scenarioId,
  });
};

export const appendLifecycleEvent = (
  state: ScenarioState,
  timestamp: string,
  eventType: 'SCENARIO_STARTED' | 'SCENARIO_PAUSED' | 'SCENARIO_RESUMED' | 'SCENARIO_COMPLETED',
  message: string,
): ScenarioState => {
  const next = cloneScenarioState(state);
  appendEvent(next, timestamp, eventType, message);
  return next;
};

const simulatedMetric = <T>(value: T, unit: string, observedAt: string) => ({
  value,
  unit,
  source: DataSource.SIMULATED,
  observedAt,
  quality: MetricQuality.GOOD,
});

const activeLampIdsFor = (state: ScenarioState): CanonicalLampId[] =>
  state.presence.activeSensorIds.flatMap((sensorId) => {
    const lampId = SENSOR_LAMP_OWNERSHIP[sensorId as keyof typeof SENSOR_LAMP_OWNERSHIP];
    return lampId === undefined ? [] : [lampId];
  });

const mergePresenceLevels = (
  current: Readonly<Record<CanonicalLampId, number>>,
  observed: Readonly<Record<CanonicalLampId, number>>,
): Record<CanonicalLampId, number> =>
  Object.fromEntries(
    CANONICAL_LAMP_IDS.map((lampId) => [lampId, Math.max(current[lampId], observed[lampId])]),
  ) as Record<CanonicalLampId, number>;

export const applyTemporalPolicies = (
  state: ScenarioState,
  nowMs: number,
  timestamp: string,
): ScenarioState => {
  const next = cloneScenarioState(state);
  const activeLampIds = activeLampIdsFor(next);

  const decisions = calculateBrightnessPolicy({
    nowMs,
    activeLampIds,
    direction: next.direction.direction,
    inactiveSinceMs: next.presence.inactiveSinceMs,
    lastPresenceLevels: next.presence.lastPresenceLevels,
    off: next.dayPhase === DayPhase.DAY,
  });

  next.lamps = next.lamps.map((lamp) => {
    const decision = decisions[lamp.lampId as CanonicalLampId];
    if (decision === undefined) return lamp;

    return {
      ...lamp,
      ...decision,
      updatedAt: timestamp,
    };
  });

  const holdRemainingMs =
    activeLampIds.length > 0
      ? MOCK_BRIGHTNESS_TIMING.holdDurationMs
      : next.presence.inactiveSinceMs === null
        ? 0
        : Math.max(
            0,
            MOCK_BRIGHTNESS_TIMING.holdDurationMs - (nowMs - next.presence.inactiveSinceMs),
          );
  next.nodes = next.nodes.map((node) => ({
    ...node,
    uptimeMs: nowMs,
    holdRemainingMs,
  }));

  const instantPowerW = next.lamps.reduce(
    (sum, lamp) => sum + (lamp.brightnessPercent / 100) * 10,
    0,
  );
  next.instantPower = { ...simulatedMetric(instantPowerW, 'W', timestamp), unit: 'W' };
  next.energyConsumed = {
    ...next.energyConsumed,
    observedAt: timestamp,
    source: DataSource.SIMULATED,
  };
  next.baselineEnergy = {
    ...next.baselineEnergy,
    observedAt: timestamp,
    source: DataSource.SIMULATED,
  };

  return next;
};

const updateSensorActivation = (
  state: ScenarioState,
  event: Extract<ScenarioEvent, { type: 'SENSOR_ACTIVATED' | 'SENSOR_DEACTIVATED' }>,
  nowMs: number,
  timestamp: string,
): void => {
  const active = event.type === 'SENSOR_ACTIVATED';
  const sensor = state.sensors.find((candidate) => candidate.sensorId === event.target.entityId);
  if (sensor !== undefined) {
    sensor.active = active;
    sensor.lastChangedAt = timestamp;
  }

  const previousActiveCount = state.presence.activeSensorIds.length;
  if (active) {
    if (!state.presence.activeSensorIds.includes(event.target.entityId)) {
      state.presence.activeSensorIds.push(event.target.entityId);
    }
    state.presence.inactiveSinceMs = null;

    const detection = detectDirection(state.directionDetector, event.target.entityId, nowMs);
    state.directionDetector = detection.state;
    if (detection.direction !== null) {
      state.direction = {
        direction: detection.direction,
        confidence: 100,
        confirmedBySensorIds: detection.confirmedBySensorIds,
        updatedAt: timestamp,
        source: DataSource.SIMULATED,
      };
      appendEvent(
        state,
        timestamp,
        EventType.DIRECTION_UPDATED,
        `Direction detected: ${detection.direction}`,
        AlertSeverity.INFO,
        { direction: detection.direction },
      );
    }

    const observedLevels = calculatePresenceLevels(
      activeLampIdsFor(state),
      state.direction.direction,
    );
    state.presence.lastPresenceLevels =
      previousActiveCount === 0
        ? observedLevels
        : mergePresenceLevels(state.presence.lastPresenceLevels, observedLevels);
  } else {
    state.presence.activeSensorIds = state.presence.activeSensorIds.filter(
      (sensorId) => sensorId !== event.target.entityId,
    );
    if (previousActiveCount > 0 && state.presence.activeSensorIds.length === 0) {
      state.presence.inactiveSinceMs = nowMs;
    }
  }

  appendEvent(
    state,
    timestamp,
    EventType.SENSOR_STATE_CHANGED,
    `${event.target.entityId} ${active ? 'activated' : 'deactivated'}`,
    AlertSeverity.INFO,
    { sensorId: event.target.entityId, active },
  );
};

const updateNodeOnline = (
  state: ScenarioState,
  event: Extract<ScenarioEvent, { type: 'SET_NODE_ONLINE' }>,
  nowMs: number,
  timestamp: string,
): void => {
  const node = state.nodes.find((candidate) => candidate.nodeId === event.target.entityId);
  if (node === undefined) return;

  node.online = event.payload.online;
  node.health = event.payload.online ? NodeHealth.HEALTHY : NodeHealth.OFFLINE;
  node.communication.health = event.payload.online
    ? CommunicationHealth.HEALTHY
    : CommunicationHealth.LOST;
  node.communication.lastHeartbeatAt = event.payload.online ? timestamp : null;
  appendEvent(
    state,
    timestamp,
    EventType.NODE_HEALTH_CHANGED,
    `${node.nodeId} is ${event.payload.online ? 'online' : 'offline'}`,
    event.payload.online ? AlertSeverity.INFO : AlertSeverity.CRITICAL,
    { nodeId: node.nodeId, online: event.payload.online },
  );

  const alertId = `${state.scenarioId}-alert-node-offline-${node.nodeId}`;
  const existingAlert = state.activeAlerts.find((alert) => alert.id === alertId);

  if (!event.payload.online) {
    if (existingAlert === undefined) {
      state.activeAlerts.push({
        id: alertId,
        code: 'NODE_OFFLINE',
        status: AlertStatus.ACTIVE,
        severity: AlertSeverity.CRITICAL,
        sourceEntity: { entityType: 'NODE', entityId: node.nodeId },
        startedAt: timestamp,
        lastObservedAt: timestamp,
        durationMs: 0,
        message: `${node.nodeId} is offline in the mock scenario`,
        probableCause: 'Deterministic SET_NODE_ONLINE scenario event',
        recommendedAction: 'Inspect the simulated node state',
        metadata: { simulated: true },
      });
      appendEvent(
        state,
        timestamp,
        EventType.ALERT_CREATED,
        `Node offline alert created for ${node.nodeId}`,
        AlertSeverity.CRITICAL,
        { alertId },
      );
    } else {
      existingAlert.lastObservedAt = timestamp;
      existingAlert.durationMs = nowMs;
    }
  } else if (existingAlert !== undefined) {
    state.activeAlerts = state.activeAlerts.filter((alert) => alert.id !== alertId);
    appendEvent(
      state,
      timestamp,
      EventType.ALERT_RESOLVED,
      `Node offline alert resolved for ${node.nodeId}`,
      AlertSeverity.INFO,
      { alertId },
    );
  }
};

export const reduceScenarioEvent = (
  state: ScenarioState,
  event: ScenarioEvent,
  nowMs: number,
  timestamp: string,
): ScenarioState => {
  const next = cloneScenarioState(state);

  switch (event.type) {
    case 'SENSOR_ACTIVATED':
    case 'SENSOR_DEACTIVATED':
      updateSensorActivation(next, event, nowMs, timestamp);
      break;
    case 'SET_LUX': {
      next.lux = { ...simulatedMetric(event.payload.lux, 'LX', timestamp), unit: 'LX' };
      next.dayPhase =
        event.payload.lux >= MOCK_DAYLIGHT_LUX_THRESHOLD ? DayPhase.DAY : DayPhase.NIGHT;
      const ambientSensor = next.sensors.find((sensor) => sensor.sensorId === 'sensor-bh1750-1');
      if (ambientSensor !== undefined) {
        ambientSensor.reading = {
          ...simulatedMetric(event.payload.lux, 'LX', timestamp),
          unit: 'LX',
        };
        ambientSensor.lastChangedAt = timestamp;
      }
      break;
    }
    case 'SET_NODE_ONLINE':
      updateNodeOnline(next, event, nowMs, timestamp);
      break;
    case 'SET_SYSTEM_MODE':
      next.systemMode = event.payload.mode;
      appendEvent(
        next,
        timestamp,
        EventType.SYSTEM_MODE_CHANGED,
        `System mode changed to ${event.payload.mode}`,
        AlertSeverity.INFO,
        { mode: event.payload.mode },
      );
      break;
    case 'SET_SENSOR_ERROR': {
      const sensor = next.sensors.find((candidate) => candidate.sensorId === event.target.entityId);
      if (sensor !== undefined) {
        sensor.health = SensorHealth.FAULT;
        sensor.errorCode = event.payload.errorCode;
        sensor.lastChangedAt = timestamp;
      }
      break;
    }
    case 'CLEAR_FAULT': {
      if (event.target.entityType === 'SENSOR') {
        const sensor = next.sensors.find(
          (candidate) => candidate.sensorId === event.target.entityId,
        );
        if (sensor !== undefined) {
          sensor.health = SensorHealth.HEALTHY;
          delete sensor.errorCode;
        }
      } else if (event.target.entityType === 'LAMP') {
        const lamp = next.lamps.find((candidate) => candidate.lampId === event.target.entityId);
        if (lamp !== undefined) lamp.health = LampHealth.HEALTHY;
      }
      break;
    }
    case 'DROP_PACKET': {
      if (event.target.entityType === 'NODE') {
        const node = next.nodes.find((candidate) => candidate.nodeId === event.target.entityId);
        if (node !== undefined) {
          node.communication.packetsSent += event.payload.count;
          node.communication.packetsLost += event.payload.count;
          node.communication.packetLossPercent = 100;
          node.communication.health = CommunicationHealth.DEGRADED;
        }
      }
      break;
    }
    case 'SET_LAMP_CURRENT': {
      const lamp = next.lamps.find((candidate) => candidate.lampId === event.target.entityId);
      if (lamp !== undefined) {
        lamp.electrical.current = {
          ...simulatedMetric(event.payload.currentA, 'A', timestamp),
          unit: 'A',
        };
      }
      break;
    }
    case 'SET_LAMP_VOLTAGE': {
      const lamp = next.lamps.find((candidate) => candidate.lampId === event.target.entityId);
      if (lamp !== undefined) {
        lamp.electrical.voltage = {
          ...simulatedMetric(event.payload.voltageV, 'V', timestamp),
          unit: 'V',
        };
      }
      break;
    }
  }

  return applyTemporalPolicies(next, nowMs, timestamp);
};

export const canonicalLampIds = (): readonly CanonicalLampId[] => CANONICAL_LAMP_IDS;
