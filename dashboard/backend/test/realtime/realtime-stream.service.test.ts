import { Logger } from '@nestjs/common';
import {
  RealtimeDomainEventDraftV1Schema,
  UtcTimestampSchema,
  type RealtimeDomainEventV1,
} from '@smart-campus/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';
import { RealtimeStreamService } from '../../src/realtime/application/realtime-stream.service.js';
import type {
  RealtimeClock,
  RealtimeStreamIdProvider,
} from '../../src/realtime/domain/realtime-ports.js';

const timestamp = UtcTimestampSchema.parse('2026-07-22T12:00:00.000Z');
const streamId = 'WS_00000000-0000-4000-8000-000000000016';
const clock: RealtimeClock = { now: () => timestamp };
const streamIdProvider: RealtimeStreamIdProvider = { getStreamId: () => streamId };

const nodeDraft = () =>
  RealtimeDomainEventDraftV1Schema.parse({
    eventType: 'NODE_UPDATED',
    payload: {
      nodeId: 'node-1',
      health: 'HEALTHY',
      online: true,
      uptimeMs: 10,
      communication: {
        health: 'HEALTHY',
        lastHeartbeatAt: timestamp,
        packetsSent: 2,
        packetsReceived: 2,
        packetsLost: 0,
        packetLossPercent: 0,
        averageLatencyMs: 3,
      },
      holdRemainingMs: 0,
    },
  });

const createService = (capacity = 3): RealtimeStreamService =>
  new RealtimeStreamService(
    clock,
    streamIdProvider,
    loadEnvironment({ WEBSOCKET_REPLAY_CAPACITY: String(capacity) }),
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RealtimeStreamService', () => {
  it('starts at cursor zero', () => {
    expect(createService().getCurrentCursor()).toBe(0);
  });

  it('uses the process-lifecycle stream id provider value', () => {
    expect(createService().getStreamId()).toBe(streamId);
  });

  it('rejects an invalid stream id at construction', () => {
    expect(
      () => new RealtimeStreamService(clock, { getStreamId: () => 'invalid' }, loadEnvironment({})),
    ).toThrow();
  });

  it('publishes the first event at sequence one', () => {
    expect(createService().publish(nodeDraft()).sequence).toBe(1);
  });

  it('increments sequence monotonically', () => {
    const service = createService();
    expect([service.publish(nodeDraft()).sequence, service.publish(nodeDraft()).sequence]).toEqual([
      1, 2,
    ]);
  });

  it('builds event id from stream id and sequence', () => {
    expect(createService().publish(nodeDraft()).eventId).toBe(`${streamId}:1`);
  });

  it('uses the injected clock for occurredAt', () => {
    expect(createService().publish(nodeDraft()).occurredAt).toBe(timestamp);
  });

  it('returns an empty replay at the current cursor', () => {
    const service = createService();
    service.publish(nodeDraft());
    expect(service.replayAfter(1)).toEqual({ kind: 'REPLAY', events: [] });
  });

  it('replays events strictly after a retained cursor', () => {
    const service = createService();
    service.publish(nodeDraft());
    service.publish(nodeDraft());
    service.publish(nodeDraft());
    const replay = service.replayAfter(1);
    expect(replay.kind === 'REPLAY' && replay.events.map((event) => event.sequence)).toEqual([
      2, 3,
    ]);
  });

  it('reports a cursor older than the bounded replay buffer', () => {
    const service = createService(2);
    service.publish(nodeDraft());
    service.publish(nodeDraft());
    service.publish(nodeDraft());
    expect(service.replayAfter(0)).toEqual({ kind: 'CURSOR_TOO_OLD' });
  });

  it('allows replay from immediately before the oldest retained event', () => {
    const service = createService(2);
    service.publish(nodeDraft());
    service.publish(nodeDraft());
    service.publish(nodeDraft());
    const replay = service.replayAfter(1);
    expect(replay.kind === 'REPLAY' && replay.events.map((event) => event.sequence)).toEqual([
      2, 3,
    ]);
  });

  it('reports a cursor ahead of the stream', () => {
    expect(createService().replayAfter(1)).toEqual({ kind: 'CURSOR_AHEAD' });
  });

  it('notifies every subscriber with the published event', () => {
    const service = createService();
    const first: RealtimeDomainEventV1[] = [];
    const second: RealtimeDomainEventV1[] = [];
    service.subscribe((event) => first.push(event));
    service.subscribe((event) => second.push(event));
    service.publish(nodeDraft());
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it('stops notifying an unsubscribed listener', () => {
    const service = createService();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);
    unsubscribe();
    service.publish(nodeDraft());
    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates a subscriber exception from other subscribers', () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = createService();
    const healthyListener = vi.fn();
    service.subscribe(() => {
      throw new Error('subscriber failure');
    });
    service.subscribe(healthyListener);
    expect(() => service.publish(nodeDraft())).not.toThrow();
    expect(healthyListener).toHaveBeenCalledOnce();
  });

  it('defensively copies the draft payload', () => {
    const service = createService();
    const draft = nodeDraft();
    const event = service.publish(draft);
    if (draft.eventType === 'NODE_UPDATED') draft.payload.health = 'OFFLINE';
    expect(event.eventType === 'NODE_UPDATED' && event.payload.health).toBe('HEALTHY');
  });

  it('defensively copies returned events away from replay storage', () => {
    const service = createService();
    const event = service.publish(nodeDraft());
    if (event.eventType === 'NODE_UPDATED') event.payload.health = 'OFFLINE';
    const replay = service.replayAfter(0);
    expect(
      replay.kind === 'REPLAY' &&
        replay.events[0]?.eventType === 'NODE_UPDATED' &&
        replay.events[0].payload.health,
    ).toBe('HEALTHY');
  });

  it('defensively copies events delivered to separate subscribers', () => {
    const service = createService();
    let observedHealth = '';
    service.subscribe((event) => {
      if (event.eventType === 'NODE_UPDATED') event.payload.health = 'OFFLINE';
    });
    service.subscribe((event) => {
      if (event.eventType === 'NODE_UPDATED') observedHealth = event.payload.health;
    });
    service.publish(nodeDraft());
    expect(observedHealth).toBe('HEALTHY');
  });
});
