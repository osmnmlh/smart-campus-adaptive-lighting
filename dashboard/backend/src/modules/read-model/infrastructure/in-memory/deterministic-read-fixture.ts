import { Inject, Injectable } from '@nestjs/common';
import {
  AlertSchema,
  AlertSeverity,
  AlertStatus,
  DataSource,
  EntityType,
  EventLogSchema,
  ScenarioDefinitionSchema,
  SystemSnapshotSchema,
  type Alert,
  type EntityType as EntityTypeValue,
  type EventLog,
  type EventType,
  type ScenarioDefinition,
  type SystemSnapshot,
} from '@smart-campus/contracts';

import { ReadModelInvalidError } from '../../../../common/http/api-errors.js';
import { centerPresenceScenario } from '../../../../scenarios/fixtures/center-presence.scenario.js';
import { emptyCampusScenario } from '../../../../scenarios/fixtures/empty-campus.scenario.js';
import { leftToRightScenario } from '../../../../scenarios/fixtures/left-to-right.scenario.js';
import { nodeOfflineScenario } from '../../../../scenarios/fixtures/node-offline.scenario.js';
import { rightToLeftScenario } from '../../../../scenarios/fixtures/right-to-left.scenario.js';
import {
  SCENARIO_ENGINE_FACTORY,
  type ScenarioEngineFactory,
} from '../../../../scenarios/scenarios.module.js';
import {
  ACTIVITY_WINDOW_START,
  FIXED_AS_OF,
  type LogCategory,
  type LogLevel,
  type ScenarioReadModel,
} from '../../domain/read-model-models.js';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

interface AlertSeed {
  id: string;
  code: Alert['code'];
  status: Alert['status'];
  severity: Alert['severity'];
  entityType: EntityTypeValue;
  entityId: string;
  startedAt: string;
  resolvedAt: string | null;
  sequence: number;
  message: string;
  scenarioId: string | null;
}

const alertSeeds: readonly AlertSeed[] = [
  {
    id: 'ALERT_SIM_001',
    code: 'NODE_OFFLINE',
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.CRITICAL,
    entityType: EntityType.NODE,
    entityId: 'node-2',
    startedAt: '2026-06-15T20:20:00.000Z',
    resolvedAt: null,
    sequence: 15,
    message: 'NODE_2 stopped reporting during the simulated Node Offline scenario.',
    scenarioId: 'node-offline',
  },
  {
    id: 'ALERT_SIM_002',
    code: 'PACKET_LOSS_HIGH',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.NODE,
    entityId: 'node-1',
    startedAt: '2026-06-15T19:40:00.000Z',
    resolvedAt: '2026-06-15T19:55:00.000Z',
    sequence: 14,
    message: 'NODE_1 packet loss exceeded the simulated warning threshold.',
    scenarioId: null,
  },
  {
    id: 'ALERT_SIM_003',
    code: 'SENSOR_STUCK_ACTIVE',
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-2',
    startedAt: '2026-06-15T20:18:00.000Z',
    resolvedAt: null,
    sequence: 13,
    message: 'IR2 remains active in the deterministic history.',
    scenarioId: 'left-to-right',
  },
  {
    id: 'ALERT_SIM_004',
    code: 'LAMP_NO_CURRENT',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.LAMP,
    entityId: 'lamp-1',
    startedAt: '2026-06-15T17:00:00.000Z',
    resolvedAt: '2026-06-15T17:10:00.000Z',
    sequence: 12,
    message: 'L1 simulated presentation state differed from the expected effect.',
    scenarioId: 'left-to-right',
  },
  {
    id: 'ALERT_SIM_005',
    code: 'MANUAL_OVERRIDE_STARTED',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.INFO,
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    startedAt: '2026-06-15T15:00:00.000Z',
    resolvedAt: '2026-06-15T15:05:00.000Z',
    sequence: 11,
    message: 'A simulated manual override record was completed.',
    scenarioId: null,
  },
  {
    id: 'ALERT_SIM_006',
    code: 'HEARTBEAT_TIMEOUT',
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.NODE,
    entityId: 'node-3',
    startedAt: '2026-06-15T20:22:00.000Z',
    resolvedAt: null,
    sequence: 10,
    message: 'NODE_3 heartbeat is delayed in the deterministic read model.',
    scenarioId: null,
  },
  {
    id: 'ALERT_SIM_007',
    code: 'DIRECTION_CONFIRMATION_TIMEOUT',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.INFO,
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-1',
    startedAt: '2026-06-15T20:00:00.000Z',
    resolvedAt: '2026-06-15T20:05:00.000Z',
    sequence: 9,
    message: 'The simulated direction confirmation warning was resolved.',
    scenarioId: 'left-to-right',
  },
  {
    id: 'ALERT_SIM_008',
    code: 'I2C_SENSOR_READ_FAILED',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.SENSOR,
    entityId: 'sensor-bh1750-1',
    startedAt: '2026-06-15T14:00:00.000Z',
    resolvedAt: '2026-06-15T14:15:00.000Z',
    sequence: 8,
    message: 'A simulated BH1750 read failure was cleared.',
    scenarioId: null,
  },
  {
    id: 'ALERT_SIM_009',
    code: 'VOLTAGE_OUT_OF_RANGE',
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.LAMP,
    entityId: 'lamp-4',
    startedAt: '2026-06-15T20:25:00.000Z',
    resolvedAt: null,
    sequence: 7,
    message: 'L4 has a presentation-only voltage warning without measured electrical data.',
    scenarioId: 'right-to-left',
  },
  {
    id: 'ALERT_SIM_010',
    code: 'CURRENT_TOO_LOW',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.INFO,
    entityType: EntityType.LAMP,
    entityId: 'lamp-3',
    startedAt: '2026-06-15T12:00:00.000Z',
    resolvedAt: '2026-06-15T12:10:00.000Z',
    sequence: 6,
    message: 'L3 simulated presentation warning was resolved.',
    scenarioId: 'center-presence',
  },
  {
    id: 'ALERT_SIM_011',
    code: 'SENSOR_STUCK_INACTIVE',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-4',
    startedAt: '2026-06-15T08:00:00.000Z',
    resolvedAt: '2026-06-15T08:20:00.000Z',
    sequence: 5,
    message: 'IR4 simulated inactive-state warning was resolved.',
    scenarioId: 'right-to-left',
  },
  {
    id: 'ALERT_SIM_012',
    code: 'MANUAL_OVERRIDE_STARTED',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.INFO,
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    startedAt: '2026-06-15T06:00:00.000Z',
    resolvedAt: '2026-06-15T06:05:00.000Z',
    sequence: 4,
    message: 'A second deterministic override history record was completed.',
    scenarioId: null,
  },
  {
    id: 'ALERT_SIM_013',
    code: 'FAIL_SAFE_ENTERED',
    status: AlertStatus.ACTIVE,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    startedAt: '2026-06-15T20:29:00.000Z',
    resolvedAt: null,
    sequence: 3,
    message: 'The simulated read model entered a presentation-only fail-safe state.',
    scenarioId: 'node-offline',
  },
  {
    id: 'ALERT_SIM_014',
    code: 'PACKET_LOSS_HIGH',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.WARNING,
    entityType: EntityType.NODE,
    entityId: 'node-3',
    startedAt: '2026-06-14T23:00:00.000Z',
    resolvedAt: '2026-06-14T23:20:00.000Z',
    sequence: 2,
    message: 'NODE_3 simulated packet loss returned to baseline.',
    scenarioId: null,
  },
  {
    id: 'ALERT_SIM_015',
    code: 'HEARTBEAT_TIMEOUT',
    status: AlertStatus.RESOLVED,
    severity: AlertSeverity.INFO,
    entityType: EntityType.NODE,
    entityId: 'node-1',
    startedAt: '2026-06-14T21:00:00.000Z',
    resolvedAt: '2026-06-14T21:20:00.000Z',
    sequence: 1,
    message: 'NODE_1 simulated heartbeat history record was resolved.',
    scenarioId: 'empty-campus',
  },
];

interface LogSeed {
  id: string;
  timestamp: string;
  sequence: number;
  category: LogCategory;
  level: LogLevel;
  eventType: EventType;
  entityType: EntityTypeValue;
  entityId: string;
  scenarioId: string | null;
  message: string;
}

const logSeeds: readonly LogSeed[] = [
  {
    id: 'LOG_SIM_001',
    timestamp: '2026-06-14T20:35:00.000Z',
    sequence: 1,
    category: 'SYSTEM',
    level: 'INFO',
    eventType: 'SYSTEM_MODE_CHANGED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: null,
    message: 'Adaptive mode selected',
  },
  {
    id: 'LOG_SIM_002',
    timestamp: '2026-06-14T21:00:00.000Z',
    sequence: 2,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_STARTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'empty-campus',
    message: 'Empty Campus started',
  },
  {
    id: 'LOG_SIM_003',
    timestamp: '2026-06-14T21:20:00.000Z',
    sequence: 3,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_COMPLETED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'empty-campus',
    message: 'Empty Campus completed',
  },
  {
    id: 'LOG_SIM_004',
    timestamp: '2026-06-14T22:00:00.000Z',
    sequence: 4,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_STARTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'right-to-left',
    message: 'Right to Left started',
  },
  {
    id: 'LOG_SIM_005',
    timestamp: '2026-06-14T22:00:01.000Z',
    sequence: 5,
    category: 'SENSOR',
    level: 'INFO',
    eventType: 'SENSOR_STATE_CHANGED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-5',
    scenarioId: 'right-to-left',
    message: 'IR5 activated',
  },
  {
    id: 'LOG_SIM_006',
    timestamp: '2026-06-14T22:00:02.000Z',
    sequence: 6,
    category: 'DIRECTION',
    level: 'INFO',
    eventType: 'DIRECTION_UPDATED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'right-to-left',
    message: 'Direction confirmed right to left',
  },
  {
    id: 'LOG_SIM_007',
    timestamp: '2026-06-14T22:00:03.000Z',
    sequence: 7,
    category: 'LAMP',
    level: 'INFO',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-4',
    scenarioId: 'right-to-left',
    message: 'L4 activated',
  },
  {
    id: 'LOG_SIM_008',
    timestamp: '2026-06-14T22:00:04.000Z',
    sequence: 8,
    category: 'SENSOR',
    level: 'INFO',
    eventType: 'SENSOR_STATE_CHANGED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-3',
    scenarioId: 'right-to-left',
    message: 'IR3 activated',
  },
  {
    id: 'LOG_SIM_009',
    timestamp: '2026-06-14T22:00:05.000Z',
    sequence: 9,
    category: 'LAMP',
    level: 'INFO',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-1',
    scenarioId: 'right-to-left',
    message: 'L1 activated',
  },
  {
    id: 'LOG_SIM_010',
    timestamp: '2026-06-14T22:15:00.000Z',
    sequence: 10,
    category: 'ALERT',
    level: 'INFO',
    eventType: 'ALERT_RESOLVED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-5',
    scenarioId: 'right-to-left',
    message: 'L5 alert resolved',
  },
  {
    id: 'LOG_SIM_011',
    timestamp: '2026-06-14T23:00:00.000Z',
    sequence: 11,
    category: 'NODE',
    level: 'WARNING',
    eventType: 'COMMUNICATION_UPDATED',
    entityType: EntityType.NODE,
    entityId: 'node-1',
    scenarioId: null,
    message: 'NODE_1 communication degraded',
  },
  {
    id: 'LOG_SIM_012',
    timestamp: '2026-06-14T23:20:00.000Z',
    sequence: 12,
    category: 'ALERT',
    level: 'INFO',
    eventType: 'ALERT_RESOLVED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-4',
    scenarioId: 'right-to-left',
    message: 'L4 warning resolved',
  },
  {
    id: 'LOG_SIM_013',
    timestamp: '2026-06-15T08:00:00.000Z',
    sequence: 13,
    category: 'SENSOR',
    level: 'WARNING',
    eventType: 'SENSOR_STATE_CHANGED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-4',
    scenarioId: 'right-to-left',
    message: 'IR4 state held',
  },
  {
    id: 'LOG_SIM_014',
    timestamp: '2026-06-15T08:20:00.000Z',
    sequence: 14,
    category: 'ALERT',
    level: 'INFO',
    eventType: 'ALERT_RESOLVED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-4',
    scenarioId: 'right-to-left',
    message: 'IR4 warning resolved',
  },
  {
    id: 'LOG_SIM_015',
    timestamp: '2026-06-15T12:00:00.000Z',
    sequence: 15,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_STARTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'center-presence',
    message: 'Center Presence started',
  },
  {
    id: 'LOG_SIM_016',
    timestamp: '2026-06-15T12:00:01.000Z',
    sequence: 16,
    category: 'SENSOR',
    level: 'INFO',
    eventType: 'MOTION_DETECTED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-3',
    scenarioId: 'center-presence',
    message: 'IR3 presence detected',
  },
  {
    id: 'LOG_SIM_017',
    timestamp: '2026-06-15T12:00:01.000Z',
    sequence: 17,
    category: 'LAMP',
    level: 'INFO',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-3',
    scenarioId: 'center-presence',
    message: 'L3 activated',
  },
  {
    id: 'LOG_SIM_018',
    timestamp: '2026-06-15T12:10:00.000Z',
    sequence: 18,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_COMPLETED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'center-presence',
    message: 'Center Presence completed',
  },
  {
    id: 'LOG_SIM_019',
    timestamp: '2026-06-15T16:00:00.000Z',
    sequence: 19,
    category: 'SYSTEM',
    level: 'WARNING',
    eventType: 'COMMAND_REJECTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: null,
    message: 'Invalid simulated metric rejected',
  },
  {
    id: 'LOG_SIM_020',
    timestamp: '2026-06-15T16:30:00.000Z',
    sequence: 20,
    category: 'ALERT',
    level: 'INFO',
    eventType: 'ALERT_RESOLVED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-3',
    scenarioId: null,
    message: 'L3 metric alert resolved',
  },
  {
    id: 'LOG_SIM_021',
    timestamp: '2026-06-15T17:00:00.000Z',
    sequence: 21,
    category: 'LAMP',
    level: 'WARNING',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-1',
    scenarioId: 'left-to-right',
    message: 'L1 state mismatch',
  },
  {
    id: 'LOG_SIM_022',
    timestamp: '2026-06-15T17:10:00.000Z',
    sequence: 22,
    category: 'ALERT',
    level: 'INFO',
    eventType: 'ALERT_RESOLVED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-1',
    scenarioId: 'left-to-right',
    message: 'L1 alert resolved',
  },
  {
    id: 'LOG_SIM_023',
    timestamp: '2026-06-15T18:00:00.000Z',
    sequence: 23,
    category: 'NODE',
    level: 'WARNING',
    eventType: 'NODE_HEALTH_CHANGED',
    entityType: EntityType.NODE,
    entityId: 'node-3',
    scenarioId: null,
    message: 'NODE_3 heartbeat delayed',
  },
  {
    id: 'LOG_SIM_024',
    timestamp: '2026-06-15T18:20:00.000Z',
    sequence: 24,
    category: 'NODE',
    level: 'INFO',
    eventType: 'NODE_HEALTH_CHANGED',
    entityType: EntityType.NODE,
    entityId: 'node-3',
    scenarioId: null,
    message: 'NODE_3 heartbeat restored',
  },
  {
    id: 'LOG_SIM_025',
    timestamp: '2026-06-15T19:40:00.000Z',
    sequence: 25,
    category: 'NODE',
    level: 'WARNING',
    eventType: 'COMMUNICATION_UPDATED',
    entityType: EntityType.NODE,
    entityId: 'node-1',
    scenarioId: null,
    message: 'NODE_1 packet loss warning',
  },
  {
    id: 'LOG_SIM_026',
    timestamp: '2026-06-15T19:55:00.000Z',
    sequence: 26,
    category: 'NODE',
    level: 'INFO',
    eventType: 'COMMUNICATION_UPDATED',
    entityType: EntityType.NODE,
    entityId: 'node-1',
    scenarioId: null,
    message: 'NODE_1 communication restored',
  },
  {
    id: 'LOG_SIM_027',
    timestamp: '2026-06-15T20:00:00.000Z',
    sequence: 27,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_STARTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'left-to-right',
    message: 'Left to Right started',
  },
  {
    id: 'LOG_SIM_028',
    timestamp: '2026-06-15T20:00:01.000Z',
    sequence: 28,
    category: 'SENSOR',
    level: 'INFO',
    eventType: 'SENSOR_STATE_CHANGED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-1',
    scenarioId: 'left-to-right',
    message: 'IR1 activated',
  },
  {
    id: 'LOG_SIM_029',
    timestamp: '2026-06-15T20:00:02.000Z',
    sequence: 29,
    category: 'DIRECTION',
    level: 'INFO',
    eventType: 'DIRECTION_UPDATED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'left-to-right',
    message: 'Direction confirmed left to right',
  },
  {
    id: 'LOG_SIM_030',
    timestamp: '2026-06-15T20:00:03.000Z',
    sequence: 30,
    category: 'LAMP',
    level: 'INFO',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-3',
    scenarioId: 'left-to-right',
    message: 'L3 activated',
  },
  {
    id: 'LOG_SIM_031',
    timestamp: '2026-06-15T20:00:05.000Z',
    sequence: 31,
    category: 'SENSOR',
    level: 'INFO',
    eventType: 'SENSOR_STATE_CHANGED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-5',
    scenarioId: 'left-to-right',
    message: 'IR5 activated',
  },
  {
    id: 'LOG_SIM_032',
    timestamp: '2026-06-15T20:05:00.000Z',
    sequence: 32,
    category: 'ALERT',
    level: 'INFO',
    eventType: 'ALERT_RESOLVED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-1',
    scenarioId: 'left-to-right',
    message: 'Direction warning resolved',
  },
  {
    id: 'LOG_SIM_033',
    timestamp: '2026-06-15T20:18:00.000Z',
    sequence: 33,
    category: 'SENSOR',
    level: 'WARNING',
    eventType: 'SENSOR_STATE_CHANGED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-ir-2',
    scenarioId: 'left-to-right',
    message: 'IR2 state held',
  },
  {
    id: 'LOG_SIM_034',
    timestamp: '2026-06-15T20:20:00.000Z',
    sequence: 34,
    category: 'SCENARIO',
    level: 'INFO',
    eventType: 'SCENARIO_STARTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'node-offline',
    message: 'Node Offline started',
  },
  {
    id: 'LOG_SIM_035',
    timestamp: '2026-06-15T20:20:01.000Z',
    sequence: 35,
    category: 'NODE',
    level: 'ERROR',
    eventType: 'NODE_HEALTH_CHANGED',
    entityType: EntityType.NODE,
    entityId: 'node-2',
    scenarioId: 'node-offline',
    message: 'NODE_2 went offline',
  },
  {
    id: 'LOG_SIM_036',
    timestamp: '2026-06-15T20:20:01.000Z',
    sequence: 36,
    category: 'LAMP',
    level: 'WARNING',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-3',
    scenarioId: 'node-offline',
    message: 'L3 moved to OFF',
  },
  {
    id: 'LOG_SIM_037',
    timestamp: '2026-06-15T20:20:02.000Z',
    sequence: 37,
    category: 'ALERT',
    level: 'ERROR',
    eventType: 'ALERT_CREATED',
    entityType: EntityType.NODE,
    entityId: 'node-2',
    scenarioId: 'node-offline',
    message: 'NODE_2 alert raised',
  },
  {
    id: 'LOG_SIM_038',
    timestamp: '2026-06-15T20:25:00.000Z',
    sequence: 38,
    category: 'LAMP',
    level: 'INFO',
    eventType: 'LAMP_STATE_CHANGED',
    entityType: EntityType.LAMP,
    entityId: 'lamp-2',
    scenarioId: 'center-presence',
    message: 'L2 presentation metric unavailable',
  },
  {
    id: 'LOG_SIM_039',
    timestamp: '2026-06-15T20:28:00.000Z',
    sequence: 39,
    category: 'SENSOR',
    level: 'WARNING',
    eventType: 'COMMUNICATION_UPDATED',
    entityType: EntityType.SENSOR,
    entityId: 'sensor-bh1750-1',
    scenarioId: null,
    message: 'BH1750 sample stale',
  },
  {
    id: 'LOG_SIM_040',
    timestamp: '2026-06-15T20:29:00.000Z',
    sequence: 40,
    category: 'SYSTEM',
    level: 'WARNING',
    eventType: 'SYSTEM_MODE_CHANGED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'node-offline',
    message: 'Simulated fail-safe entered',
  },
  {
    id: 'LOG_SIM_041',
    timestamp: '2026-06-15T20:29:00.000Z',
    sequence: 41,
    category: 'ALERT',
    level: 'WARNING',
    eventType: 'ALERT_CREATED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: 'node-offline',
    message: 'Fail-safe warning recorded',
  },
  {
    id: 'LOG_SIM_042',
    timestamp: '2026-06-15T20:30:00.000Z',
    sequence: 42,
    category: 'SYSTEM',
    level: 'INFO',
    eventType: 'COMMAND_ACCEPTED',
    entityType: EntityType.SYSTEM,
    entityId: 'system',
    scenarioId: null,
    message: 'Activity snapshot finalized',
  },
];

const createAlert = (seed: AlertSeed): Alert => {
  const lastObservedAt = seed.resolvedAt ?? FIXED_AS_OF;
  return {
    id: seed.id,
    code: seed.code,
    status: seed.status,
    severity: seed.severity,
    sourceEntity: { entityType: seed.entityType, entityId: seed.entityId },
    startedAt: seed.startedAt,
    lastObservedAt,
    ...(seed.resolvedAt === null ? {} : { resolvedAt: seed.resolvedAt }),
    durationMs: Date.parse(lastObservedAt) - Date.parse(seed.startedAt),
    message: seed.message,
    probableCause: 'Deterministic simulated read-model condition.',
    recommendedAction: 'Inspect the simulated record; no device action is available.',
    metadata: {
      sequence: seed.sequence,
      scenarioId: seed.scenarioId,
      dataSource: DataSource.SIMULATED,
    },
  };
};

const levelSeverity: Readonly<Record<LogLevel, Alert['severity']>> = {
  INFO: AlertSeverity.INFO,
  WARNING: AlertSeverity.WARNING,
  ERROR: AlertSeverity.CRITICAL,
};

const createLog = (seed: LogSeed): EventLog => ({
  id: seed.id,
  timestamp: seed.timestamp,
  source: { entityType: seed.entityType, entityId: seed.entityId },
  eventType: seed.eventType,
  severity: levelSeverity[seed.level],
  message: seed.message,
  metadata: {
    category: seed.category,
    level: seed.level,
    sequence: seed.sequence,
    details: `${seed.message}. This is a deterministic simulated history record.`,
    dataSource: DataSource.SIMULATED,
  },
  ...(seed.scenarioId === null ? {} : { scenarioRunId: seed.scenarioId }),
});

@Injectable()
export class DeterministicReadFixture {
  readonly windowStart = ACTIVITY_WINDOW_START;
  readonly asOf = FIXED_AS_OF;

  private readonly snapshot: SystemSnapshot;
  private readonly alerts: readonly Alert[];
  private readonly logs: readonly EventLog[];
  private readonly scenarios: readonly ScenarioReadModel[];

  constructor(@Inject(SCENARIO_ENGINE_FACTORY) scenarioEngineFactory: ScenarioEngineFactory) {
    const snapshotResult = SystemSnapshotSchema.safeParse(
      scenarioEngineFactory(FIXED_AS_OF).loadScenario(emptyCampusScenario),
    );
    const alertResults = alertSeeds.map((seed) => AlertSchema.safeParse(createAlert(seed)));
    const logResults = logSeeds.map((seed) => EventLogSchema.safeParse(createLog(seed)));
    const scenarioResults = [
      emptyCampusScenario,
      leftToRightScenario,
      rightToLeftScenario,
      centerPresenceScenario,
      nodeOfflineScenario,
    ].map((scenario) => ScenarioDefinitionSchema.safeParse(scenario));

    if (
      !snapshotResult.success ||
      alertResults.some((result) => !result.success) ||
      logResults.some((result) => !result.success) ||
      scenarioResults.some((result) => !result.success)
    ) {
      throw new ReadModelInvalidError();
    }

    this.snapshot = snapshotResult.data;
    this.alerts = alertResults.map((result) => {
      if (!result.success) throw new ReadModelInvalidError();
      return result.data;
    });
    this.logs = logResults.map((result) => {
      if (!result.success) throw new ReadModelInvalidError();
      return result.data;
    });
    this.scenarios = scenarioResults.map((result) => {
      if (!result.success) throw new ReadModelInvalidError();
      return this.toScenarioReadModel(result.data);
    });
  }

  getSnapshot(): SystemSnapshot {
    return clone(this.snapshot);
  }

  getAlerts(): readonly Alert[] {
    return clone(this.alerts);
  }

  getLogs(): readonly EventLog[] {
    return clone(this.logs);
  }

  getScenarios(): readonly ScenarioReadModel[] {
    return clone(this.scenarios);
  }

  private toScenarioReadModel(definition: ScenarioDefinition): ScenarioReadModel {
    return {
      id: definition.id,
      title: definition.name,
      description: definition.description,
      durationMs: definition.durationMs,
      eventCount: definition.events.length,
      expectedOutcome: definition.description,
      simulated: true,
      initialVirtualTimestamp: FIXED_AS_OF,
      definition,
    };
  }
}
