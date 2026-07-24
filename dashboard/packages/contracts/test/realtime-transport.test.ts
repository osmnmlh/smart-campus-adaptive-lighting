import { describe, expect, it } from 'vitest';
import {
  PingMessageV1Schema,
  REALTIME_PROTOCOL_VERSION,
  RealtimeClientMessageV1Schema,
  RealtimeConnectionStateV1Schema,
  RealtimeCursorSchema,
  RealtimeDataModeSchema,
  RealtimeDomainEventDraftV1Schema,
  RealtimeDomainEventV1Schema,
  RealtimeProtocolVersionSchema,
  RealtimeRequestIdSchema,
  RealtimeSequenceSchema,
  RealtimeServerMessageV1Schema,
  RealtimeStreamIdSchema,
  RequestSnapshotMessageV1Schema,
  ResumeMessageV1Schema,
  EnergyAnalyticsSummarySchema,
} from '../src/index.js';
import {
  lampSnapshot,
  nodeSnapshot,
  sensorSnapshot,
  systemSnapshot,
  timestamp,
} from './fixtures.js';

const streamId = 'WS_00000000-0000-4000-8000-000000000016';
const alert = {
  id: 'alert-1',
  code: 'NODE_OFFLINE',
  status: 'ACTIVE',
  severity: 'CRITICAL',
  sourceEntity: { entityType: 'NODE', entityId: 'node-1' },
  startedAt: timestamp,
  lastObservedAt: timestamp,
  durationMs: 0,
  message: 'Node is offline',
  probableCause: 'Power loss',
  recommendedAction: 'Inspect node',
  metadata: {},
};
const log = {
  id: 'log-1',
  timestamp,
  source: { entityType: 'SYSTEM', entityId: 'system' },
  eventType: 'SYSTEM_MODE_CHANGED',
  severity: 'INFO',
  message: 'System mode changed',
  metadata: {},
};
const connectionState = {
  dataMode: 'LIVE',
  mqttEnabled: true,
  brokerConnected: true,
  gatewayStatus: 'ONLINE',
  onlineNodeIds: ['NODE_1', 'NODE_2', 'NODE_3'],
  changedAt: timestamp,
} as const;
const energySummary = EnergyAnalyticsSummarySchema.parse({
  calculatedAt: timestamp,
  sessionStartedAt: timestamp,
  sessionDurationSeconds: 0,
  nominalLampPowerW: 10,
  measuredLampCount: 0,
  estimatedLampCount: 1,
  simulatedLampCount: 0,
  totalLampCount: 1,
  measurementCoveragePercent: 0,
  currentActualPowerW: 3,
  currentReferencePowerW: 10,
  currentSavedPowerW: 7,
  currentSavingsPercent: 70,
  actualSessionEnergyWh: 0,
  referenceSessionEnergyWh: 0,
  savedSessionEnergyWh: 0,
  sessionSavingsPercent: 0,
  lamps: [
    {
      lampId: 'lamp-1',
      brightnessPercent: 30,
      currentPowerW: 3,
      dataSource: 'ESTIMATED',
      measurementFresh: false,
    },
  ],
  dataSource: 'CALCULATED',
  referenceDataSource: 'NOMINAL',
  savingsDataSource: 'CALCULATED',
  quality: 'GOOD',
  limitationCode: null,
  persistenceMode: 'SESSION_ONLY',
});

const eventDrafts = [
  { eventType: 'SYSTEM_SNAPSHOT_UPDATED', payload: systemSnapshot },
  { eventType: 'NODE_UPDATED', payload: nodeSnapshot },
  { eventType: 'LAMP_UPDATED', payload: lampSnapshot },
  { eventType: 'SENSOR_UPDATED', payload: sensorSnapshot },
  { eventType: 'ALERT_UPSERTED', payload: alert },
  { eventType: 'LOG_APPENDED', payload: log },
  { eventType: 'SYSTEM_CONNECTION_UPDATED', payload: connectionState },
  { eventType: 'ENERGY_ANALYTICS_UPDATED', payload: energySummary },
] as const;

const eventFrom = (draft: (typeof eventDrafts)[number]) => ({
  messageType: 'DOMAIN_EVENT',
  protocolVersion: 1,
  streamId,
  sequence: 1,
  eventId: `${streamId}:1`,
  occurredAt: timestamp,
  ...draft,
});

describe('realtime primitive contracts', () => {
  it('exports protocol version 1 from the package root', () => {
    expect(REALTIME_PROTOCOL_VERSION).toBe(1);
  });

  it('accepts protocol version 1', () => {
    expect(RealtimeProtocolVersionSchema.parse(1)).toBe(1);
  });

  it.each([0, 2, '1'])('rejects unsupported protocol version %s', (value) => {
    expect(RealtimeProtocolVersionSchema.safeParse(value).success).toBe(false);
  });

  it('accepts a WS-prefixed UUID stream id', () => {
    expect(RealtimeStreamIdSchema.parse(streamId)).toBe(streamId);
  });

  it.each(['stream-1', 'WS_not-a-uuid', '00000000-0000-4000-8000-000000000016'])(
    'rejects invalid stream id %s',
    (value) => {
      expect(RealtimeStreamIdSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each([1, 42, Number.MAX_SAFE_INTEGER])('accepts positive safe sequence %s', (value) => {
    expect(RealtimeSequenceSchema.parse(value)).toBe(value);
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])('rejects invalid sequence %s', (value) => {
    expect(RealtimeSequenceSchema.safeParse(value).success).toBe(false);
  });

  it.each([0, 42])('accepts cursor %s', (value) => {
    expect(RealtimeCursorSchema.parse(value)).toBe(value);
  });

  it.each([-1, 1.5])('rejects invalid cursor %s', (value) => {
    expect(RealtimeCursorSchema.safeParse(value).success).toBe(false);
  });

  it.each(['', '   ', ' leading', 'trailing ', 'line\nbreak'])(
    'rejects unsafe request id %j',
    (value) => {
      expect(RealtimeRequestIdSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('realtime MQTT connection contracts', () => {
  it.each(['SIMULATED', 'DISCONNECTED', 'DEGRADED', 'LIVE'] as const)(
    'accepts additive data mode %s',
    (mode) => expect(RealtimeDataModeSchema.parse(mode)).toBe(mode),
  );

  it.each(['UNKNOWN', 'OFFLINE', 'BROKEN', '', null])('rejects invalid data mode %j', (mode) => {
    expect(RealtimeDataModeSchema.safeParse(mode).success).toBe(false);
  });

  it('accepts and round-trips the typed live connection state', () => {
    const parsed = RealtimeConnectionStateV1Schema.parse(
      JSON.parse(JSON.stringify(connectionState)),
    );
    expect(parsed).toEqual(connectionState);
  });

  it('rejects duplicate online node identifiers', () => {
    expect(
      RealtimeConnectionStateV1Schema.safeParse({
        ...connectionState,
        onlineNodeIds: ['NODE_1', 'NODE_1'],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown connection-state fields', () => {
    expect(
      RealtimeConnectionStateV1Schema.safeParse({ ...connectionState, rawBrokerUrl: 'secret' })
        .success,
    ).toBe(false);
  });

  it.each([
    { ...connectionState, dataMode: 'DEGRADED' },
    { ...connectionState, mqttEnabled: false, dataMode: 'LIVE' },
    { ...connectionState, brokerConnected: false, dataMode: 'LIVE' },
    { ...connectionState, gatewayStatus: 'OFFLINE', dataMode: 'LIVE' },
    { ...connectionState, onlineNodeIds: ['NODE_1', 'NODE_2'], dataMode: 'LIVE' },
  ])('rejects a connection state with inconsistent data-mode semantics %#', (state) => {
    expect(RealtimeConnectionStateV1Schema.safeParse(state).success).toBe(false);
  });
});

describe('realtime domain event contracts', () => {
  it.each(eventDrafts)('accepts the $eventType draft payload', (draft) => {
    expect(RealtimeDomainEventDraftV1Schema.safeParse(draft).success).toBe(true);
  });

  it.each(eventDrafts)('accepts the $eventType event envelope', (draft) => {
    expect(RealtimeDomainEventV1Schema.safeParse(eventFrom(draft)).success).toBe(true);
  });

  it('rejects a payload that does not match its event type', () => {
    expect(
      RealtimeDomainEventDraftV1Schema.safeParse({
        eventType: 'NODE_UPDATED',
        payload: lampSnapshot,
      }).success,
    ).toBe(false);
  });

  it('rejects an event id that does not match stream and sequence', () => {
    expect(
      RealtimeDomainEventV1Schema.safeParse({
        ...eventFrom(eventDrafts[1]),
        eventId: `${streamId}:99`,
      }).success,
    ).toBe(false);
  });

  it('rejects unknown domain event types', () => {
    expect(
      RealtimeDomainEventDraftV1Schema.safeParse({ eventType: 'SCENARIO_UPDATED', payload: {} })
        .success,
    ).toBe(false);
  });

  it('rejects extra domain event fields', () => {
    expect(
      RealtimeDomainEventV1Schema.safeParse({ ...eventFrom(eventDrafts[0]), debug: true }).success,
    ).toBe(false);
  });
});

describe('realtime client message contracts', () => {
  it('accepts REQUEST_SNAPSHOT', () => {
    expect(
      RequestSnapshotMessageV1Schema.safeParse({
        messageType: 'REQUEST_SNAPSHOT',
        protocolVersion: 1,
      }).success,
    ).toBe(true);
  });

  it('accepts PING with a request id', () => {
    expect(
      PingMessageV1Schema.safeParse({
        messageType: 'PING',
        protocolVersion: 1,
        requestId: 'ping-1',
      }).success,
    ).toBe(true);
  });

  it('accepts RESUME from cursor zero', () => {
    expect(
      ResumeMessageV1Schema.safeParse({
        messageType: 'RESUME',
        protocolVersion: 1,
        streamId,
        afterSequence: 0,
      }).success,
    ).toBe(true);
  });

  it.each([
    { messageType: 'PING', requestId: 'ping-1' },
    { messageType: 'PING', protocolVersion: 2, requestId: 'ping-1' },
    { messageType: 'PING', protocolVersion: 1 },
    { messageType: 'RESUME', protocolVersion: 1, streamId, afterSequence: -1 },
    { messageType: 'UNKNOWN', protocolVersion: 1 },
    { messageType: 'REQUEST_SNAPSHOT', protocolVersion: 1, extra: true },
  ])('rejects invalid client message %#', (message) => {
    expect(RealtimeClientMessageV1Schema.safeParse(message).success).toBe(false);
  });
});

describe('realtime server message contracts', () => {
  it.each([
    {
      messageType: 'SERVER_READY',
      protocolVersion: 1,
      streamId,
      cursor: 0,
      serverTime: timestamp,
      dataMode: 'SIMULATED',
    },
    {
      messageType: 'SYSTEM_SNAPSHOT',
      protocolVersion: 1,
      streamId,
      cursor: 0,
      sentAt: timestamp,
      dataMode: 'SIMULATED',
      snapshot: systemSnapshot,
    },
    eventFrom(eventDrafts[0]),
    {
      messageType: 'RESYNC_REQUIRED',
      protocolVersion: 1,
      streamId,
      cursor: 0,
      reason: 'STREAM_CHANGED',
    },
    {
      messageType: 'PONG',
      protocolVersion: 1,
      requestId: 'ping-1',
      serverTime: timestamp,
    },
    {
      messageType: 'ERROR',
      protocolVersion: 1,
      code: 'INVALID_JSON',
      message: 'Message must contain valid JSON',
    },
  ])('accepts server message %#', (message) => {
    expect(RealtimeServerMessageV1Schema.safeParse(message).success).toBe(true);
  });

  it.each(['SIMULATED', 'DISCONNECTED', 'DEGRADED', 'LIVE'] as const)(
    'accepts SERVER_READY data mode %s',
    (dataMode) => {
      expect(
        RealtimeServerMessageV1Schema.safeParse({
          messageType: 'SERVER_READY',
          protocolVersion: 1,
          streamId,
          cursor: 0,
          serverTime: timestamp,
          dataMode,
        }).success,
      ).toBe(true);
    },
  );

  it('rejects error details that could leak internals', () => {
    expect(
      RealtimeServerMessageV1Schema.safeParse({
        messageType: 'ERROR',
        protocolVersion: 1,
        code: 'INVALID_JSON',
        message: 'Invalid JSON',
        details: 'stack trace',
      }).success,
    ).toBe(false);
  });
});
