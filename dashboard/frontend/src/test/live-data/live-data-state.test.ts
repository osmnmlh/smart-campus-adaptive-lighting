import { RealtimeDomainEventV1Schema, type RealtimeDomainEventV1 } from '@smart-campus/contracts';
import {
  createLiveInitialState,
  createSimulatedLiveDataState,
  liveDataReducer,
  type LiveDataState,
} from '@/features/live-data/live-data-state';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

const streamId = 'WS_123e4567-e89b-12d3-a456-426614174000';
const occurredAt = '2026-06-15T20:31:00.000Z';

function readyState(): LiveDataState {
  const loaded = liveDataReducer(createLiveInitialState(), {
    type: 'INITIAL_DATA',
    snapshot: overviewSnapshot,
    alerts: [],
    logs: [],
  });
  return liveDataReducer(loaded, {
    type: 'SERVER_READY',
    streamId,
    cursor: 0,
    dataMode: 'SIMULATED',
    serverTime: occurredAt,
  });
}

function domainEvent(
  sequence: number,
  variant: Pick<RealtimeDomainEventV1, 'eventType' | 'payload'>,
  eventStreamId = streamId,
): RealtimeDomainEventV1 {
  return RealtimeDomainEventV1Schema.parse({
    messageType: 'DOMAIN_EVENT',
    protocolVersion: 1,
    streamId: eventStreamId,
    sequence,
    eventId: `${eventStreamId}:${sequence}`,
    occurredAt,
    ...variant,
  });
}

describe('liveDataReducer', () => {
  it('preserves the deterministic simulated baseline', () => {
    const state = createSimulatedLiveDataState();
    expect(state.transportStatus).toBe('SIMULATED');
    expect(state.snapshot).toBe(overviewSnapshot);
    expect(state.alerts.length).toBeGreaterThan(0);
  });

  it('starts live mode without mock data', () => {
    const state = createLiveInitialState();
    expect(state.snapshot).toBeNull();
    expect(state.alerts).toEqual([]);
    expect(state.logs).toEqual([]);
  });

  it('stores validated initial REST data', () => {
    const state = liveDataReducer(createLiveInitialState(), {
      type: 'INITIAL_DATA',
      snapshot: overviewSnapshot,
      alerts: [],
      logs: [],
    });
    expect(state.snapshot).toBe(overviewSnapshot);
    expect(state.snapshotHistory).toHaveLength(1);
  });

  it('records SERVER_READY transport and backend state', () => {
    const state = readyState();
    expect(state.transportStatus).toBe('CONNECTED');
    expect(state.backendDataMode).toBe('SIMULATED');
    expect(state.streamId).toBe(streamId);
  });

  it('ignores a snapshot from another established stream', () => {
    const state = readyState();
    const next = liveDataReducer(state, {
      type: 'SYSTEM_SNAPSHOT',
      streamId: 'WS_223e4567-e89b-12d3-a456-426614174000',
      cursor: 4,
      dataMode: 'LIVE',
      snapshot: overviewSnapshot,
    });
    expect(next).toBe(state);
  });

  it('replaces a node immutably', () => {
    const state = readyState();
    const payload = { ...overviewSnapshot.nodes[0]!, online: false };
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(1, { eventType: 'NODE_UPDATED', payload }),
    });
    expect(next.snapshot?.nodes[0]?.online).toBe(false);
    expect(state.snapshot?.nodes[0]?.online).toBe(true);
  });

  it('replaces a lamp and advances the cursor', () => {
    const state = readyState();
    const payload = { ...overviewSnapshot.lamps[0]!, brightnessPercent: 77 };
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(2, { eventType: 'LAMP_UPDATED', payload }),
    });
    expect(next.snapshot?.lamps[0]?.brightnessPercent).toBe(77);
    expect(next.latestSequence).toBe(2);
  });

  it('replaces a sensor', () => {
    const state = readyState();
    const payload = { ...overviewSnapshot.sensors[0]!, active: true };
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(3, { eventType: 'SENSOR_UPDATED', payload }),
    });
    expect(next.snapshot?.sensors[0]?.active).toBe(true);
  });

  it('ignores duplicate and stale sequences', () => {
    const state = { ...readyState(), latestSequence: 10 };
    const payload = { ...overviewSnapshot.lamps[0]!, brightnessPercent: 1 };
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(10, { eventType: 'LAMP_UPDATED', payload }),
    });
    expect(next).toBe(state);
  });

  it('ignores domain events from another stream', () => {
    const state = readyState();
    const payload = { ...overviewSnapshot.lamps[0]!, brightnessPercent: 1 };
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(
        1,
        { eventType: 'LAMP_UPDATED', payload },
        'WS_223e4567-e89b-12d3-a456-426614174000',
      ),
    });
    expect(next).toBe(state);
  });

  it('upserts active alerts in history and snapshot', () => {
    const state = readyState();
    const payload = createSimulatedLiveDataState().alerts[0]!;
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(4, { eventType: 'ALERT_UPSERTED', payload }),
    });
    expect(next.alerts).toContainEqual(payload);
    expect(next.snapshot?.activeAlerts).toContainEqual(payload);
  });

  it('removes resolved alerts from active snapshot alerts', () => {
    const base = createSimulatedLiveDataState().alerts[0]!;
    const active = liveDataReducer(readyState(), {
      type: 'DOMAIN_EVENT',
      event: domainEvent(1, { eventType: 'ALERT_UPSERTED', payload: base }),
    });
    const resolved = {
      ...base,
      status: 'RESOLVED' as const,
      resolvedAt: occurredAt,
      lastObservedAt: occurredAt,
    };
    const next = liveDataReducer(active, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(2, { eventType: 'ALERT_UPSERTED', payload: resolved }),
    });
    expect(next.snapshot?.activeAlerts.some((alert) => alert.id === base.id)).toBe(false);
  });

  it('appends logs only once', () => {
    const payload = createSimulatedLiveDataState().logs[0]!;
    const once = liveDataReducer(readyState(), {
      type: 'DOMAIN_EVENT',
      event: domainEvent(1, { eventType: 'LOG_APPENDED', payload }),
    });
    const duplicate = liveDataReducer(once, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(2, { eventType: 'LOG_APPENDED', payload }),
    });
    expect(duplicate.logs.filter((log) => log.id === payload.id)).toHaveLength(1);
  });

  it('updates backend mode independently of transport status', () => {
    const state = readyState();
    const next = liveDataReducer(state, {
      type: 'DOMAIN_EVENT',
      event: domainEvent(1, {
        eventType: 'SYSTEM_CONNECTION_UPDATED',
        payload: {
          dataMode: 'DEGRADED',
          mqttEnabled: true,
          brokerConnected: true,
          gatewayStatus: 'OFFLINE',
          onlineNodeIds: [],
          changedAt: occurredAt,
        },
      }),
    });
    expect(next.backendDataMode).toBe('DEGRADED');
    expect(next.transportStatus).toBe('CONNECTED');
  });

  it('deduplicates REST and WebSocket snapshots with the same timestamp', () => {
    const state = readyState();
    const next = liveDataReducer(state, {
      type: 'SYSTEM_SNAPSHOT',
      streamId,
      cursor: 0,
      dataMode: 'SIMULATED',
      snapshot: overviewSnapshot,
    });
    expect(next.snapshotHistory).toHaveLength(1);
  });

  it('bounds session snapshot history to 120 entries', () => {
    let state = readyState();
    for (let cursor = 1; cursor <= 125; cursor += 1) {
      const snapshotAt = new Date(Date.parse(occurredAt) + cursor * 1_000).toISOString();
      state = liveDataReducer(state, {
        type: 'SYSTEM_SNAPSHOT',
        streamId,
        cursor,
        dataMode: 'SIMULATED',
        snapshot: { ...overviewSnapshot, snapshotAt },
      });
    }
    expect(state.snapshotHistory).toHaveLength(120);
  });
});
