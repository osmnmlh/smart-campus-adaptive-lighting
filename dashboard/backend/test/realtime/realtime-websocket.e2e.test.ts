import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  RealtimeServerMessageV1Schema,
  SystemSnapshotSchema,
  UtcTimestampSchema,
  type RealtimeServerMessageV1,
} from '@smart-campus/contracts';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import WebSocket, { type RawData } from 'ws';

import { AppModule } from '../../src/app.module.js';
import { loadEnvironment } from '../../src/common/config/environment.js';
import { RealtimeSnapshotService } from '../../src/realtime/application/realtime-snapshot.service.js';
import { RealtimeStreamService } from '../../src/realtime/application/realtime-stream.service.js';
import {
  REALTIME_CLOCK,
  REALTIME_CONFIG,
  REALTIME_STREAM_ID_PROVIDER,
  type RealtimeClock,
  type RealtimeStreamIdProvider,
} from '../../src/realtime/domain/realtime-ports.js';
import { RealtimeGateway } from '../../src/realtime/transport/realtime.gateway.js';
import { configureRealtimeWebSocketAdapter } from '../../src/realtime/transport/realtime-ws-adapter.js';

const allowedOrigin = 'http://localhost:3000';
const fixedTime = UtcTimestampSchema.parse('2026-07-22T12:00:00.000Z');
const fixedStreamId = 'WS_00000000-0000-4000-8000-000000000016';
const environment = loadEnvironment({
  NODE_ENV: 'test',
  WEBSOCKET_ALLOWED_ORIGINS: allowedOrigin,
  WEBSOCKET_REPLAY_CAPACITY: '2',
  WEBSOCKET_MAX_PAYLOAD_BYTES: '16384',
});
const clock: RealtimeClock = { now: () => fixedTime };
const streamIdProvider: RealtimeStreamIdProvider = { getStreamId: () => fixedStreamId };

class WebSocketHarness {
  private readonly queuedMessages: RealtimeServerMessageV1[] = [];
  private readonly waiters: Array<(message: RealtimeServerMessageV1) => void> = [];

  constructor(readonly socket: WebSocket) {
    socket.on('message', (data: RawData) => {
      const message = RealtimeServerMessageV1Schema.parse(JSON.parse(data.toString()));
      const waiter = this.waiters.shift();
      if (waiter === undefined) this.queuedMessages.push(message);
      else waiter(message);
    });
  }

  nextMessage(): Promise<RealtimeServerMessageV1> {
    const message = this.queuedMessages.shift();
    if (message !== undefined) return Promise.resolve(message);
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  sendJson(message: unknown): void {
    this.socket.send(JSON.stringify(message));
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolve) => this.socket.once('close', () => resolve()));
    this.socket.close();
    await closed;
  }
}

describe('realtime WebSocket transport', () => {
  let app: INestApplication;
  let moduleReference: TestingModule;
  let websocketUrl: string;
  let stream: RealtimeStreamService;
  let snapshots: RealtimeSnapshotService;
  let gateway: RealtimeGateway;
  const openClients = new Set<WebSocketHarness>();

  const connect = async (): Promise<WebSocketHarness> => {
    const socket = new WebSocket(websocketUrl, { origin: allowedOrigin });
    const harness = new WebSocketHarness(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    openClients.add(harness);
    return harness;
  };

  const rejectedStatus = async (origin?: string): Promise<number> =>
    new Promise((resolve, reject) => {
      const options = origin === undefined ? {} : { origin };
      const socket = new WebSocket(websocketUrl, options);
      socket.on('error', () => undefined);
      socket.once('open', () =>
        reject(new Error('WebSocket connection was unexpectedly accepted')),
      );
      socket.once('unexpected-response', (_request, response) => {
        const status = response.statusCode ?? 0;
        response.resume();
        resolve(status);
      });
    });

  const consumeInitialMessages = async (
    client: WebSocketHarness,
  ): Promise<[RealtimeServerMessageV1, RealtimeServerMessageV1]> => [
    await client.nextMessage(),
    await client.nextMessage(),
  ];

  beforeAll(async () => {
    moduleReference = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REALTIME_CONFIG)
      .useValue(environment)
      .overrideProvider(REALTIME_CLOCK)
      .useValue(clock)
      .overrideProvider(REALTIME_STREAM_ID_PROVIDER)
      .useValue(streamIdProvider)
      .compile();
    app = moduleReference.createNestApplication();
    configureRealtimeWebSocketAdapter(app, environment);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as { port: number };
    websocketUrl = `ws://127.0.0.1:${address.port}/ws/v1`;
    stream = moduleReference.get(RealtimeStreamService);
    snapshots = moduleReference.get(RealtimeSnapshotService);
    gateway = moduleReference.get(RealtimeGateway);
  });

  afterEach(async () => {
    await Promise.all([...openClients].map((client) => client.close()));
    openClients.clear();
  });

  afterAll(async () => {
    await app.close();
    await moduleReference.close();
  });

  it('accepts an exact allowed Origin at /ws/v1', async () => {
    const client = await connect();
    expect(client.socket.readyState).toBe(WebSocket.OPEN);
  });

  it('sends SERVER_READY before SYSTEM_SNAPSHOT', async () => {
    const client = await connect();
    const [ready, snapshot] = await consumeInitialMessages(client);
    expect(ready.messageType).toBe('SERVER_READY');
    expect(snapshot.messageType).toBe('SYSTEM_SNAPSHOT');
  });

  it('announces the fixed stream, current cursor and simulated data mode', async () => {
    const client = await connect();
    const [ready] = await consumeInitialMessages(client);
    expect(ready).toMatchObject({
      messageType: 'SERVER_READY',
      protocolVersion: 1,
      streamId: fixedStreamId,
      cursor: stream.getCurrentCursor(),
      serverTime: fixedTime,
      dataMode: 'SIMULATED',
    });
  });

  it('sends the canonical runtime-valid system snapshot', async () => {
    const client = await connect();
    const [, message] = await consumeInitialMessages(client);
    expect(
      message.messageType === 'SYSTEM_SNAPSHOT' &&
        SystemSnapshotSchema.safeParse(message.snapshot).success,
    ).toBe(true);
    expect(message.messageType === 'SYSTEM_SNAPSHOT' && message.snapshot).toEqual(
      snapshots.getCurrentSnapshot(),
    );
  });

  it('answers PING with PONG and the same request id', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({ messageType: 'PING', protocolVersion: 1, requestId: 'ping-e2e' });
    expect(await client.nextMessage()).toEqual({
      messageType: 'PONG',
      protocolVersion: 1,
      requestId: 'ping-e2e',
      serverTime: fixedTime,
    });
  });

  it('answers REQUEST_SNAPSHOT with a fresh snapshot envelope', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({ messageType: 'REQUEST_SNAPSHOT', protocolVersion: 1 });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'SYSTEM_SNAPSHOT',
      protocolVersion: 1,
      streamId: fixedStreamId,
      dataMode: 'SIMULATED',
    });
  });

  it('returns a safe ERROR for malformed JSON', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.socket.send('{invalid');
    expect(await client.nextMessage()).toEqual({
      messageType: 'ERROR',
      protocolVersion: 1,
      code: 'INVALID_JSON',
      message: 'Message must contain valid JSON',
    });
  });

  it('returns a safe ERROR for an unsupported protocol version', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({ messageType: 'PING', protocolVersion: 2, requestId: 'future' });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'ERROR',
      code: 'UNSUPPORTED_PROTOCOL_VERSION',
      requestId: 'future',
    });
  });

  it('returns a safe ERROR for an unknown message type', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({ messageType: 'DELETE_ALL', protocolVersion: 1 });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'ERROR',
      code: 'UNKNOWN_MESSAGE_TYPE',
    });
  });

  it('returns a safe ERROR when a required client field is missing', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({ messageType: 'PING', protocolVersion: 1 });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'ERROR',
      code: 'INVALID_CLIENT_MESSAGE',
    });
  });

  it('rejects binary application frames', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.socket.send(Buffer.from('binary'), { binary: true });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'ERROR',
      code: 'BINARY_FRAME_NOT_SUPPORTED',
    });
  });

  it('enforces the configured maximum payload at the ws transport', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    const closed = new Promise<number>((resolve) =>
      client.socket.once('close', (code) => resolve(code)),
    );
    client.socket.send('x'.repeat(environment.websocketMaxPayloadBytes + 1));
    expect(await closed).toBe(1009);
  });

  it('closes with policy violation after the third invalid application message', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    const closed = new Promise<number>((resolve) =>
      client.socket.once('close', (code) => resolve(code)),
    );
    for (let count = 0; count < 3; count += 1) {
      client.socket.send('{invalid');
      expect((await client.nextMessage()).messageType).toBe('ERROR');
    }
    expect(await closed).toBe(1008);
  });

  it('rejects a connection with no Origin header', async () => {
    expect(await rejectedStatus()).toBe(401);
  });

  it('rejects a prefix-attack Origin', async () => {
    expect(await rejectedStatus('http://localhost:3000.evil.test')).toBe(401);
  });

  it('rejects an unconfigured well-formed Origin', async () => {
    expect(await rejectedStatus('https://dashboard.example.test')).toBe(401);
  });

  it('broadcasts a published typed domain event', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    const node = snapshots.getCurrentSnapshot().nodes[0];
    if (node === undefined) throw new Error('Expected deterministic node fixture');
    const published = stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    expect(await client.nextMessage()).toEqual(published);
  });

  it('broadcasts one publication to multiple connected clients', async () => {
    const first = await connect();
    const second = await connect();
    await consumeInitialMessages(first);
    await consumeInitialMessages(second);
    const node = snapshots.getCurrentSnapshot().nodes[0];
    if (node === undefined) throw new Error('Expected deterministic node fixture');
    const published = stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    expect(await first.nextMessage()).toEqual(published);
    expect(await second.nextMessage()).toEqual(published);
  });

  it('replays retained events for RESUME on the current stream', async () => {
    const afterSequence = stream.getCurrentCursor();
    const node = snapshots.getCurrentSnapshot().nodes[0];
    if (node === undefined) throw new Error('Expected deterministic node fixture');
    const first = stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    const second = stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({
      messageType: 'RESUME',
      protocolVersion: 1,
      streamId: fixedStreamId,
      afterSequence,
    });
    expect(await client.nextMessage()).toEqual(first);
    expect(await client.nextMessage()).toEqual(second);
  });

  it('requires resync and then sends snapshot when the stream changed', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({
      messageType: 'RESUME',
      protocolVersion: 1,
      streamId: 'WS_10000000-0000-4000-8000-000000000016',
      afterSequence: 0,
    });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'RESYNC_REQUIRED',
      reason: 'STREAM_CHANGED',
    });
    expect((await client.nextMessage()).messageType).toBe('SYSTEM_SNAPSHOT');
  });

  it('requires resync and then sends snapshot when the cursor is ahead', async () => {
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({
      messageType: 'RESUME',
      protocolVersion: 1,
      streamId: fixedStreamId,
      afterSequence: stream.getCurrentCursor() + 1,
    });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'RESYNC_REQUIRED',
      reason: 'CURSOR_AHEAD',
    });
    expect((await client.nextMessage()).messageType).toBe('SYSTEM_SNAPSHOT');
  });

  it('requires resync when the cursor fell outside the bounded replay buffer', async () => {
    const afterSequence = stream.getCurrentCursor();
    const node = snapshots.getCurrentSnapshot().nodes[0];
    if (node === undefined) throw new Error('Expected deterministic node fixture');
    stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    stream.publish({ eventType: 'NODE_UPDATED', payload: node });
    const client = await connect();
    await consumeInitialMessages(client);
    client.sendJson({
      messageType: 'RESUME',
      protocolVersion: 1,
      streamId: fixedStreamId,
      afterSequence,
    });
    expect(await client.nextMessage()).toMatchObject({
      messageType: 'RESYNC_REQUIRED',
      reason: 'CURSOR_TOO_OLD',
    });
    expect((await client.nextMessage()).messageType).toBe('SYSTEM_SNAPSHOT');
  });

  it('keeps the health REST endpoint available', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it.each(['/api/v1/system/snapshot', '/api/v1/alerts', '/api/v1/logs', '/api/v1/scenarios'])(
    'keeps REST read endpoint %s available',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(200);
    },
  );

  it('does not introduce a REST write endpoint for snapshots', async () => {
    await request(app.getHttpServer()).post('/api/v1/system/snapshot').send({}).expect(404);
  });

  it('cleans up the connection registry on disconnect', async () => {
    const initialCount = gateway.getActiveConnectionCount();
    const client = await connect();
    expect(gateway.getActiveConnectionCount()).toBe(initialCount + 1);
    await client.close();
    openClients.delete(client);
    for (
      let turn = 0;
      turn < 10 && gateway.getActiveConnectionCount() !== initialCount;
      turn += 1
    ) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    expect(gateway.getActiveConnectionCount()).toBe(initialCount);
  });
});
