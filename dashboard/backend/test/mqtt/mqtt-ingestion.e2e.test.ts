import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  EnergyAnalyticsSummarySchema,
  RealtimeServerMessageV1Schema,
  SystemSnapshotSchema,
  UtcTimestampSchema,
  type NodeTransportEnvelopeV1,
  type RealtimeDomainEventV1,
  type RealtimeServerMessageV1,
  type UtcTimestamp,
} from '@smart-campus/contracts';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket, { type RawData } from 'ws';

import { AppModule } from '../../src/app.module.js';
import { loadEnvironment } from '../../src/common/config/environment.js';
import { MqttIngestionService } from '../../src/mqtt/application/mqtt-ingestion.service.js';
import { MqttRuntimeStateService } from '../../src/mqtt/application/mqtt-runtime-state.service.js';
import {
  MQTT_CLIENT,
  MQTT_CONFIG,
  MQTT_LIVENESS_SCHEDULER,
  type LivenessSchedulerPort,
  type MqttClientPort,
  type MqttConnectionListener,
  type MqttInboundMessage,
  type MqttMessageListener,
  type MqttSubscription,
} from '../../src/mqtt/domain/mqtt-ports.js';
import { RealtimeStreamService } from '../../src/realtime/application/realtime-stream.service.js';
import {
  REALTIME_CLOCK,
  REALTIME_CONFIG,
  REALTIME_STREAM_ID_PROVIDER,
  type RealtimeClock,
  type RealtimeStreamIdProvider,
} from '../../src/realtime/domain/realtime-ports.js';
import { configureRealtimeWebSocketAdapter } from '../../src/realtime/transport/realtime-ws-adapter.js';
import {
  electricalMessage,
  encodeMqttPayload,
  gatewayEnvelope,
  gatewayStatus,
  heartbeatMessage,
  lampMessage,
  sensorMessage,
} from './mqtt-fixtures.js';

const allowedOrigin = 'http://localhost:3000';
const fixedStreamId = 'WS_00000000-0000-4000-8000-000000000017';
const enabledEnvironment = loadEnvironment({
  NODE_ENV: 'test',
  MQTT_ENABLED: 'true',
  WEBSOCKET_ALLOWED_ORIGINS: allowedOrigin,
  WEBSOCKET_REPLAY_CAPACITY: '200',
});

class MutableClock implements RealtimeClock {
  current: UtcTimestamp = UtcTimestampSchema.parse('2026-07-22T12:00:00.000Z');

  now(): UtcTimestamp {
    return this.current;
  }
}

class FakeMqttClient implements MqttClientPort {
  readonly subscriptions: MqttSubscription[][] = [];
  started = false;
  stopped = false;
  private readonly messageListeners = new Set<MqttMessageListener>();
  private readonly connectionListeners = new Set<MqttConnectionListener>();

  async start(): Promise<void> {
    this.started = true;
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  async subscribe(subscriptions: readonly MqttSubscription[]): Promise<void> {
    this.subscriptions.push(subscriptions.map((subscription) => ({ ...subscription })));
  }

  onMessage(listener: MqttMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onConnectionState(listener: MqttConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  emitMessage(message: MqttInboundMessage): void {
    for (const listener of [...this.messageListeners]) listener(message);
  }

  emitConnection(state: 'CONNECTED' | 'DISCONNECTED'): void {
    for (const listener of [...this.connectionListeners]) listener(state);
  }
}

class ManualLivenessScheduler implements LivenessSchedulerPort {
  started = false;
  stopped = false;
  private task: (() => void) | null = null;

  start(task: () => void): void {
    this.started = true;
    this.task = task;
  }

  stop(): void {
    this.stopped = true;
    this.task = null;
  }

  run(): void {
    if (this.task === null) throw new Error('Manual liveness scheduler is not running');
    this.task();
  }
}

class WebSocketHarness {
  private readonly messages: RealtimeServerMessageV1[] = [];
  private readonly waiters: Array<(message: RealtimeServerMessageV1) => void> = [];

  constructor(readonly socket: WebSocket) {
    socket.on('message', (data: RawData) => {
      const message = RealtimeServerMessageV1Schema.parse(JSON.parse(data.toString()));
      const waiter = this.waiters.shift();
      if (waiter === undefined) this.messages.push(message);
      else waiter(message);
    });
  }

  nextMessage(): Promise<RealtimeServerMessageV1> {
    const message = this.messages.shift();
    return message === undefined
      ? new Promise((resolve) => this.waiters.push(resolve))
      : Promise.resolve(message);
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolve) => this.socket.once('close', () => resolve()));
    this.socket.close();
    await closed;
  }
}

const streamIdProvider: RealtimeStreamIdProvider = { getStreamId: () => fixedStreamId };

const nodeTopic = (message: NodeTransportEnvelopeV1): string => {
  const kind =
    message.messageType === 'HEARTBEAT'
      ? 'heartbeat'
      : message.messageType === 'ELECTRICAL_MEASUREMENT'
        ? 'telemetry'
        : 'events';
  return `smart-campus/v1/nodes/${message.nodeId}/${kind}`;
};

const inboundNode = (
  message: NodeTransportEnvelopeV1,
  overrides: Partial<MqttInboundMessage> = {},
): MqttInboundMessage => ({
  topic: nodeTopic(message),
  payload: encodeMqttPayload(gatewayEnvelope(message)),
  qos: 1,
  retain: false,
  dup: false,
  ...overrides,
});

const inboundGateway = (status: 'ONLINE' | 'OFFLINE' = 'ONLINE'): MqttInboundMessage => ({
  topic: 'smart-campus/v1/gateways/GW_1/status',
  payload: encodeMqttPayload(gatewayStatus(status)),
  qos: 1,
  retain: true,
  dup: false,
});

describe('MQTT ingestion integration', () => {
  let app: INestApplication;
  let moduleReference: TestingModule;
  let mqtt: FakeMqttClient;
  let scheduler: ManualLivenessScheduler;
  let clock: MutableClock;
  let ingestion: MqttIngestionService;
  let runtimeState: MqttRuntimeStateService;
  let stream: RealtimeStreamService;
  let websocketUrl: string;
  const clients = new Set<WebSocketHarness>();

  const currentSnapshot = async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/system/snapshot').expect(200);
    return SystemSnapshotSchema.parse((response.body as { data: unknown }).data);
  };

  const currentEnergy = async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/energy/summary').expect(200);
    return EnergyAnalyticsSummarySchema.parse((response.body as { data: unknown }).data);
  };

  const eventsAfter = (cursor: number): readonly RealtimeDomainEventV1[] => {
    const replay = stream.replayAfter(cursor);
    if (replay.kind !== 'REPLAY') throw new Error(`Expected replay, received ${replay.kind}`);
    return replay.events;
  };

  const connectWebSocket = async (): Promise<WebSocketHarness> => {
    const socket = new WebSocket(websocketUrl, { origin: allowedOrigin });
    const client = new WebSocketHarness(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    clients.add(client);
    return client;
  };

  const consumeInitialWebSocketMessages = async (client: WebSocketHarness): Promise<void> => {
    expect((await client.nextMessage()).messageType).toBe('SERVER_READY');
    expect((await client.nextMessage()).messageType).toBe('SYSTEM_SNAPSHOT');
  };

  beforeEach(async () => {
    mqtt = new FakeMqttClient();
    scheduler = new ManualLivenessScheduler();
    clock = new MutableClock();
    moduleReference = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MQTT_CONFIG)
      .useValue(enabledEnvironment)
      .overrideProvider(REALTIME_CONFIG)
      .useValue(enabledEnvironment)
      .overrideProvider(MQTT_CLIENT)
      .useValue(mqtt)
      .overrideProvider(MQTT_LIVENESS_SCHEDULER)
      .useValue(scheduler)
      .overrideProvider(REALTIME_CLOCK)
      .useValue(clock)
      .overrideProvider(REALTIME_STREAM_ID_PROVIDER)
      .useValue(streamIdProvider)
      .compile();
    app = moduleReference.createNestApplication();
    configureRealtimeWebSocketAdapter(app, enabledEnvironment);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as { port: number };
    websocketUrl = `ws://127.0.0.1:${address.port}/ws/v1`;
    ingestion = moduleReference.get(MqttIngestionService);
    runtimeState = moduleReference.get(MqttRuntimeStateService);
    stream = moduleReference.get(RealtimeStreamService);
  });

  afterEach(async () => {
    await Promise.all([...clients].map((client) => client.close()));
    clients.clear();
    await app.close();
    expect(mqtt.stopped).toBe(true);
    expect(scheduler.stopped).toBe(true);
    await moduleReference.close();
  });

  it('starts the enabled fake MQTT adapter and manual liveness scheduler', () => {
    expect(mqtt.started).toBe(true);
    expect(scheduler.started).toBe(true);
    expect(runtimeState.getConnectionState().dataMode).toBe('DISCONNECTED');
  });

  it('does not start the MQTT adapter when an isolated app is disabled', async () => {
    const disabledMqtt = new FakeMqttClient();
    const disabledScheduler = new ManualLivenessScheduler();
    const disabled = loadEnvironment({ NODE_ENV: 'test', MQTT_ENABLED: 'false' });
    const reference = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MQTT_CONFIG)
      .useValue(disabled)
      .overrideProvider(REALTIME_CONFIG)
      .useValue(disabled)
      .overrideProvider(MQTT_CLIENT)
      .useValue(disabledMqtt)
      .overrideProvider(MQTT_LIVENESS_SCHEDULER)
      .useValue(disabledScheduler)
      .compile();
    const disabledApp = reference.createNestApplication();
    try {
      configureRealtimeWebSocketAdapter(disabledApp, disabled);
      await disabledApp.init();
      expect(disabledMqtt.started).toBe(false);
      expect(disabledScheduler.started).toBe(false);
    } finally {
      await disabledApp.close();
      await reference.close();
    }
  });

  it('transitions from DISCONNECTED to DEGRADED and subscribes to the exact QoS 1 filters', () => {
    mqtt.emitConnection('CONNECTED');
    expect(runtimeState.getConnectionState().dataMode).toBe('DEGRADED');
    expect(mqtt.subscriptions).toEqual([
      [
        { topicFilter: 'smart-campus/v1/nodes/+/+', qos: 1 },
        { topicFilter: 'smart-campus/v1/gateways/+/status', qos: 1 },
      ],
    ]);
  });

  it('accepts a retained gateway ONLINE status without making nodes online', () => {
    mqtt.emitConnection('CONNECTED');
    expect(ingestion.ingest(inboundGateway())).toBe('ACCEPTED');
    expect(runtimeState.getConnectionState()).toMatchObject({
      dataMode: 'DEGRADED',
      gatewayStatus: 'ONLINE',
      onlineNodeIds: [],
    });
  });

  it('updates the REST node snapshot after an accepted heartbeat', async () => {
    mqtt.emitMessage(inboundNode(heartbeatMessage()));
    const snapshot = await currentSnapshot();
    expect(snapshot.nodes.find((node) => node.nodeId === 'node-1')).toMatchObject({
      online: true,
      firmwareVersion: '1.0.0',
      uptimeMs: 1_000,
      communication: { lastMessageReceived: 'HEARTBEAT', lastSequenceNumber: 1 },
    });
  });

  it('updates the owned REST sensor after an accepted sensor event', async () => {
    mqtt.emitMessage(inboundNode(sensorMessage()));
    const snapshot = await currentSnapshot();
    expect(snapshot.sensors.find((sensor) => sensor.sensorId === 'sensor-ir-1')).toMatchObject({
      active: true,
      health: 'HEALTHY',
      lastChangedAt: clock.current,
    });
  });

  it('updates canonical lamp fields after an accepted lamp event', async () => {
    mqtt.emitMessage(inboundNode(lampMessage()));
    const snapshot = await currentSnapshot();
    expect(snapshot.lamps.find((lamp) => lamp.lampId === 'lamp-3')).toMatchObject({
      operatingState: 'ACTIVE',
      brightnessPercent: 60,
      targetBrightnessPercent: 60,
      pwmDutyPercent: 60,
    });
  });

  it('records only the canonical measured electrical telemetry on L3', async () => {
    mqtt.emitMessage(inboundNode(electricalMessage()));
    const snapshot = await currentSnapshot();
    expect(snapshot.lamps.find((lamp) => lamp.lampId === 'lamp-3')?.electrical).toMatchObject({
      voltage: { value: 12, unit: 'V', source: 'MEASURED' },
      current: { value: 0.5, unit: 'A', source: 'MEASURED' },
      power: { value: 6, unit: 'W', source: 'MEASURED' },
      energy: { value: 1.25, unit: 'Wh', source: 'MEASURED' },
    });
  });

  it('serves a contract-valid session-only energy summary', async () => {
    const summary = await currentEnergy();
    expect(summary).toMatchObject({
      nominalLampPowerW: 10,
      totalLampCount: 5,
      measuredLampCount: 0,
      estimatedLampCount: 5,
      currentReferencePowerW: 50,
      dataSource: 'CALCULATED',
      referenceDataSource: 'NOMINAL',
      persistenceMode: 'SESSION_ONLY',
    });
  });

  it('recalculates energy after an accepted lamp update', async () => {
    const before = await currentEnergy();
    mqtt.emitMessage(inboundNode(lampMessage()));
    const after = await currentEnergy();
    expect(after.currentActualPowerW).not.toBe(before.currentActualPowerW);
    expect(after.lamps.find((lamp) => lamp.lampId === 'lamp-3')).toMatchObject({
      brightnessPercent: 60,
      dataSource: 'ESTIMATED',
    });
  });

  it('uses accepted fresh electrical power only for L3', async () => {
    mqtt.emitMessage(inboundNode(electricalMessage()));
    const summary = await currentEnergy();
    expect(summary.measuredLampCount).toBe(1);
    expect(summary.measurementCoveragePercent).toBe(20);
    expect(summary.lamps.find((lamp) => lamp.lampId === 'lamp-3')).toMatchObject({
      currentPowerW: 6,
      dataSource: 'MEASURED',
      measurementFresh: true,
    });
    expect(
      summary.lamps
        .filter((lamp) => lamp.lampId !== 'lamp-3')
        .every((lamp) => lamp.dataSource === 'ESTIMATED'),
    ).toBe(true);
  });

  it('does not change energy after an invalid MQTT message', async () => {
    const before = await currentEnergy();
    expect(
      ingestion.ingest(
        inboundNode(lampMessage(), {
          topic: 'smart-campus/v1/nodes/NODE_1/telemetry',
        }),
      ),
    ).toBe('REJECTED');
    expect(await currentEnergy()).toEqual(before);
  });

  it('enters LIVE only after broker, gateway and all three nodes are online', () => {
    mqtt.emitConnection('CONNECTED');
    mqtt.emitMessage(inboundGateway());
    mqtt.emitMessage(inboundNode(heartbeatMessage()));
    mqtt.emitMessage(inboundNode(heartbeatMessage({ nodeId: 'NODE_2' })));
    expect(runtimeState.getConnectionState().dataMode).toBe('DEGRADED');
    mqtt.emitMessage(inboundNode(heartbeatMessage({ nodeId: 'NODE_3' })));
    expect(runtimeState.getConnectionState()).toMatchObject({
      dataMode: 'LIVE',
      onlineNodeIds: ['NODE_1', 'NODE_2', 'NODE_3'],
    });
  });

  it('suppresses an exact QoS redelivery without state or realtime mutation', async () => {
    const message = inboundNode(heartbeatMessage());
    expect(ingestion.ingest(message)).toBe('ACCEPTED');
    const cursor = stream.getCurrentCursor();
    const snapshot = await currentSnapshot();
    expect(ingestion.ingest({ ...message, dup: true })).toBe('DUPLICATE');
    expect(stream.getCurrentCursor()).toBe(cursor);
    expect(await currentSnapshot()).toEqual(snapshot);
  });

  it('rejects a conflicting duplicate without changing the node', async () => {
    expect(ingestion.ingest(inboundNode(heartbeatMessage()))).toBe('ACCEPTED');
    const snapshot = await currentSnapshot();
    const conflict = heartbeatMessage({
      payload: { firmwareVersion: '1.0.1', communicationChannel: 6 },
    });
    expect(ingestion.ingest(inboundNode(conflict))).toBe('CONFLICT');
    expect(await currentSnapshot()).toEqual(snapshot);
  });

  it('rejects a topic and payload node mismatch without mutation', async () => {
    const before = await currentSnapshot();
    const message = inboundNode(heartbeatMessage(), {
      topic: 'smart-campus/v1/nodes/NODE_2/heartbeat',
    });
    expect(ingestion.ingest(message)).toBe('REJECTED');
    expect(await currentSnapshot()).toEqual(before);
  });

  it('rejects invalid UTF-8 JSON without crashing the HTTP backend', async () => {
    expect(
      ingestion.ingest({
        ...inboundNode(heartbeatMessage()),
        payload: Uint8Array.from([0xc3, 0x28]),
      }),
    ).toBe('REJECTED');
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it.each([['[]'], ['42'], ['null']])('rejects non-object JSON %s', (json) => {
    expect(
      ingestion.ingest({
        ...inboundNode(heartbeatMessage()),
        payload: new TextEncoder().encode(json),
      }),
    ).toBe('REJECTED');
  });

  it('rejects an oversized payload before decoding it', () => {
    expect(
      ingestion.ingest({
        ...inboundNode(heartbeatMessage()),
        payload: new Uint8Array(enabledEnvironment.mqttMaxPayloadBytes + 1),
      }),
    ).toBe('REJECTED');
  });

  it('rejects a retained node message', async () => {
    const before = await currentSnapshot();
    expect(ingestion.ingest(inboundNode(heartbeatMessage(), { retain: true }))).toBe('REJECTED');
    expect(await currentSnapshot()).toEqual(before);
  });

  it.each([0, 2] as const)('rejects node QoS %s', (qos) => {
    expect(ingestion.ingest(inboundNode(heartbeatMessage(), { qos }))).toBe('REJECTED');
  });

  it('marks a sequence gap as communication degradation while accepting the new value', async () => {
    expect(ingestion.ingest(inboundNode(heartbeatMessage()))).toBe('ACCEPTED');
    expect(ingestion.ingest(inboundNode(heartbeatMessage({ sequence: 4, uptimeMs: 4_000 })))).toBe(
      'ACCEPTED',
    );
    const node = (await currentSnapshot()).nodes.find((entry) => entry.nodeId === 'node-1');
    expect(node?.communication).toMatchObject({
      health: 'DEGRADED',
      packetsLost: 2,
      lastSequenceNumber: 4,
    });
  });

  it('recovers communication health after three consecutive normal sequences', async () => {
    ingestion.ingest(inboundNode(heartbeatMessage()));
    ingestion.ingest(inboundNode(heartbeatMessage({ sequence: 4, uptimeMs: 4_000 })));
    ingestion.ingest(inboundNode(heartbeatMessage({ sequence: 5, uptimeMs: 5_000 })));
    ingestion.ingest(inboundNode(heartbeatMessage({ sequence: 6, uptimeMs: 6_000 })));
    ingestion.ingest(inboundNode(heartbeatMessage({ sequence: 7, uptimeMs: 7_000 })));
    const node = (await currentSnapshot()).nodes.find((entry) => entry.nodeId === 'node-1');
    expect(node?.communication.health).toBe('HEALTHY');
  });

  it('accepts a higher boot restart at sequence one', async () => {
    ingestion.ingest(inboundNode(heartbeatMessage()));
    expect(
      ingestion.ingest(
        inboundNode(heartbeatMessage({ bootId: 'BOOT_00000002', sequence: 1, uptimeMs: 10 })),
      ),
    ).toBe('ACCEPTED');
    expect((await currentSnapshot()).nodes.find((node) => node.nodeId === 'node-1')?.uptimeMs).toBe(
      10,
    );
  });

  it('rejects a lower boot replay without changing last seen', async () => {
    ingestion.ingest(
      inboundNode(heartbeatMessage({ bootId: 'BOOT_00000002', sequence: 1, uptimeMs: 10 })),
    );
    const before = await currentSnapshot();
    expect(ingestion.ingest(inboundNode(heartbeatMessage()))).toBe('REJECTED');
    expect(await currentSnapshot()).toEqual(before);
  });

  it('marks a timed-out node offline exactly once using the manual scheduler', async () => {
    ingestion.ingest(inboundNode(heartbeatMessage()));
    clock.current = UtcTimestampSchema.parse('2026-07-22T12:00:15.000Z');
    scheduler.run();
    const cursor = stream.getCurrentCursor();
    expect((await currentSnapshot()).nodes.find((node) => node.nodeId === 'node-1')).toMatchObject({
      online: false,
      communication: { health: 'LOST' },
    });
    scheduler.run();
    expect(stream.getCurrentCursor()).toBe(cursor);
  });

  it('recovers an offline node on the next valid origin message', async () => {
    ingestion.ingest(inboundNode(heartbeatMessage()));
    clock.current = UtcTimestampSchema.parse('2026-07-22T12:00:15.000Z');
    scheduler.run();
    clock.current = UtcTimestampSchema.parse('2026-07-22T12:00:16.000Z');
    ingestion.ingest(inboundNode(heartbeatMessage({ sequence: 2, uptimeMs: 2_000 })));
    expect((await currentSnapshot()).nodes.find((node) => node.nodeId === 'node-1')?.online).toBe(
      true,
    );
  });

  it('moves LIVE to DEGRADED on a retained gateway OFFLINE status', () => {
    mqtt.emitConnection('CONNECTED');
    mqtt.emitMessage(inboundGateway());
    mqtt.emitMessage(inboundNode(heartbeatMessage()));
    mqtt.emitMessage(inboundNode(heartbeatMessage({ nodeId: 'NODE_2' })));
    mqtt.emitMessage(inboundNode(heartbeatMessage({ nodeId: 'NODE_3' })));
    expect(runtimeState.getConnectionState().dataMode).toBe('LIVE');
    mqtt.emitMessage(inboundGateway('OFFLINE'));
    expect(runtimeState.getConnectionState().dataMode).toBe('DEGRADED');
  });

  it('moves to DISCONNECTED without clearing the last accepted read model', async () => {
    mqtt.emitConnection('CONNECTED');
    mqtt.emitMessage(inboundNode(heartbeatMessage()));
    const before = await currentSnapshot();
    mqtt.emitConnection('DISCONNECTED');
    expect(runtimeState.getConnectionState().dataMode).toBe('DISCONNECTED');
    expect(await currentSnapshot()).toEqual(before);
  });

  it('restores explicit subscriptions after broker reconnect', () => {
    mqtt.emitConnection('CONNECTED');
    mqtt.emitConnection('DISCONNECTED');
    mqtt.emitConnection('CONNECTED');
    expect(mqtt.subscriptions).toHaveLength(2);
    expect(mqtt.subscriptions[1]).toEqual(mqtt.subscriptions[0]);
  });

  it('keeps all HTTP read endpoints and excludes a command route', async () => {
    for (const path of [
      '/health',
      '/api/v1/system/snapshot',
      '/api/v1/alerts',
      '/api/v1/logs',
      '/api/v1/scenarios',
      '/api/v1/energy/summary',
    ]) {
      await request(app.getHttpServer()).get(path).expect(200);
    }
    await request(app.getHttpServer()).post('/api/v1/commands').send({}).expect(404);
  });

  it.each([
    ['NODE_UPDATED', heartbeatMessage()],
    ['SENSOR_UPDATED', sensorMessage()],
    ['LAMP_UPDATED', lampMessage()],
    ['LAMP_UPDATED', electricalMessage()],
  ] as const)('publishes normalized %s over the native WebSocket', async (eventType, message) => {
    const client = await connectWebSocket();
    try {
      await consumeInitialWebSocketMessages(client);
      mqtt.emitMessage(inboundNode(message));
      const connectionEvent = await client.nextMessage();
      const entityEvent = await client.nextMessage();
      expect(connectionEvent).toMatchObject({
        messageType: 'DOMAIN_EVENT',
        eventType: 'SYSTEM_CONNECTION_UPDATED',
      });
      expect(entityEvent).toMatchObject({ messageType: 'DOMAIN_EVENT', eventType });
      expect(JSON.stringify(entityEvent)).not.toContain('gatewaySequence');
      expect(JSON.stringify(entityEvent)).not.toContain('smart-campus/v1');
    } finally {
      await client.close();
      clients.delete(client);
    }
  });

  it('emits no second entity event for an exact duplicate', () => {
    const message = inboundNode(heartbeatMessage());
    ingestion.ingest(message);
    const cursor = stream.getCurrentCursor();
    ingestion.ingest({ ...message, dup: true });
    expect(eventsAfter(cursor)).toEqual([]);
  });

  it('publishes a typed energy event after a lamp mutation and none for its QoS duplicate', () => {
    const message = inboundNode(lampMessage());
    const cursor = stream.getCurrentCursor();
    expect(ingestion.ingest(message)).toBe('ACCEPTED');
    const events = eventsAfter(cursor);
    expect(events.map((event) => event.eventType)).toContain('ENERGY_ANALYTICS_UPDATED');
    const afterAccepted = stream.getCurrentCursor();
    expect(ingestion.ingest({ ...message, dup: true })).toBe('DUPLICATE');
    expect(eventsAfter(afterAccepted)).toEqual([]);
  });

  it('keeps an accepted read-model update when realtime publication fails', async () => {
    const publish = vi.spyOn(stream, 'publish').mockImplementation(() => {
      throw new Error('test publisher failure');
    });
    try {
      expect(ingestion.ingest(inboundNode(heartbeatMessage()))).toBe('ACCEPTED');
      expect((await currentSnapshot()).nodes.find((node) => node.nodeId === 'node-1')?.online).toBe(
        true,
      );
    } finally {
      publish.mockRestore();
    }
  });
});
