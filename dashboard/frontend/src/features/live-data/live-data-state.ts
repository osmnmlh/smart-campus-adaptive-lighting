import {
  AlertSchema,
  EventLogSchema,
  type Alert,
  type EventLog,
  type RealtimeDataMode,
  type RealtimeDomainEventV1,
  type SystemSnapshot,
} from '@smart-campus/contracts';
import { activityFixture } from '@/features/activity/activity-fixture';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

export type TransportStatus =
  'SIMULATED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';

export type LiveDataState = Readonly<{
  configuredMode: 'simulated' | 'live' | null;
  snapshot: SystemSnapshot | null;
  alerts: readonly Alert[];
  logs: readonly EventLog[];
  snapshotHistory: readonly SystemSnapshot[];
  backendDataMode: RealtimeDataMode;
  transportStatus: TransportStatus;
  streamId: string | null;
  latestSequence: number;
  lastUpdatedAt: string | null;
  errorMessage: string | null;
}>;

export type LiveDataAction =
  | Readonly<{ type: 'CONFIG_ERROR'; message: string }>
  | Readonly<{ type: 'CONNECTING'; reconnecting: boolean }>
  | Readonly<{
      type: 'INITIAL_DATA';
      snapshot: SystemSnapshot;
      alerts: readonly Alert[];
      logs: readonly EventLog[];
    }>
  | Readonly<{ type: 'INITIAL_ERROR'; message: string }>
  | Readonly<{
      type: 'SERVER_READY';
      streamId: string;
      cursor: number;
      dataMode: RealtimeDataMode;
      serverTime: string;
    }>
  | Readonly<{
      type: 'SYSTEM_SNAPSHOT';
      streamId: string;
      cursor: number;
      dataMode: RealtimeDataMode;
      snapshot: SystemSnapshot;
    }>
  | Readonly<{ type: 'DOMAIN_EVENT'; event: RealtimeDomainEventV1 }>
  | Readonly<{ type: 'RESYNC_REQUIRED'; message: string }>
  | Readonly<{ type: 'TRANSPORT_CLOSED'; reconnecting: boolean }>
  | Readonly<{ type: 'SERVER_ERROR'; message: string }>;

const MAX_LOGS = 500;
const MAX_HISTORY = 120;

function boundedHistory(
  history: readonly SystemSnapshot[],
  snapshot: SystemSnapshot,
): readonly SystemSnapshot[] {
  if (history.at(-1)?.snapshotAt === snapshot.snapshotAt) {
    return [...history.slice(0, -1), snapshot];
  }
  const next = [...history, snapshot];
  return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
}

function replaceById<T>(items: readonly T[], item: T, idOf: (value: T) => string): T[] {
  const itemId = idOf(item);
  const index = items.findIndex((candidate) => idOf(candidate) === itemId);
  if (index < 0) return [...items, item];
  return items.map((candidate, candidateIndex) => (candidateIndex === index ? item : candidate));
}

function applyDomainEvent(snapshot: SystemSnapshot, event: RealtimeDomainEventV1): SystemSnapshot {
  const snapshotAt = event.occurredAt;
  switch (event.eventType) {
    case 'SYSTEM_SNAPSHOT_UPDATED':
      return event.payload;
    case 'NODE_UPDATED':
      return {
        ...snapshot,
        snapshotAt,
        nodes: replaceById(snapshot.nodes, event.payload, (node) => node.nodeId),
      };
    case 'LAMP_UPDATED':
      return {
        ...snapshot,
        snapshotAt,
        lamps: replaceById(snapshot.lamps, event.payload, (lamp) => lamp.lampId),
      };
    case 'SENSOR_UPDATED':
      return {
        ...snapshot,
        snapshotAt,
        sensors: replaceById(snapshot.sensors, event.payload, (sensor) => sensor.sensorId),
      };
    case 'ALERT_UPSERTED': {
      const withoutAlert = snapshot.activeAlerts.filter((alert) => alert.id !== event.payload.id);
      return {
        ...snapshot,
        snapshotAt,
        activeAlerts:
          event.payload.status === 'ACTIVE' ? [...withoutAlert, event.payload] : withoutAlert,
      };
    }
    case 'LOG_APPENDED':
      return {
        ...snapshot,
        snapshotAt,
        recentEvents: replaceById(snapshot.recentEvents, event.payload, (log) => log.id).slice(
          -MAX_LOGS,
        ),
      };
    case 'SYSTEM_CONNECTION_UPDATED':
      return { ...snapshot, snapshotAt };
  }
}

export function createSimulatedLiveDataState(): LiveDataState {
  return {
    configuredMode: 'simulated',
    snapshot: overviewSnapshot,
    alerts: activityFixture.alerts.map((alert) => AlertSchema.parse(alert)),
    logs: activityFixture.logs.map((log) => EventLogSchema.parse(log)),
    snapshotHistory: [overviewSnapshot],
    backendDataMode: 'SIMULATED',
    transportStatus: 'SIMULATED',
    streamId: null,
    latestSequence: 0,
    lastUpdatedAt: overviewSnapshot.snapshotAt,
    errorMessage: null,
  };
}

export function createLiveInitialState(): LiveDataState {
  return {
    configuredMode: 'live',
    snapshot: null,
    alerts: [],
    logs: [],
    snapshotHistory: [],
    backendDataMode: 'DISCONNECTED',
    transportStatus: 'DISCONNECTED',
    streamId: null,
    latestSequence: 0,
    lastUpdatedAt: null,
    errorMessage: null,
  };
}

export function liveDataReducer(state: LiveDataState, action: LiveDataAction): LiveDataState {
  switch (action.type) {
    case 'CONFIG_ERROR':
      return {
        ...createLiveInitialState(),
        configuredMode: null,
        transportStatus: 'ERROR',
        errorMessage: action.message,
      };
    case 'CONNECTING':
      return {
        ...state,
        transportStatus: action.reconnecting ? 'RECONNECTING' : 'CONNECTING',
        errorMessage: null,
      };
    case 'INITIAL_DATA':
      return {
        ...state,
        snapshot: action.snapshot,
        alerts: [...action.alerts],
        logs: [...action.logs].slice(0, MAX_LOGS),
        snapshotHistory: boundedHistory(state.snapshotHistory, action.snapshot),
        lastUpdatedAt: action.snapshot.snapshotAt,
        errorMessage: null,
      };
    case 'INITIAL_ERROR':
      return {
        ...state,
        backendDataMode: 'DISCONNECTED',
        transportStatus: 'ERROR',
        errorMessage: action.message,
      };
    case 'SERVER_READY':
      return {
        ...state,
        streamId: action.streamId,
        latestSequence: action.cursor,
        backendDataMode: action.dataMode,
        transportStatus: 'CONNECTED',
        lastUpdatedAt: action.serverTime,
        errorMessage: null,
      };
    case 'SYSTEM_SNAPSHOT':
      if (state.streamId !== null && action.streamId !== state.streamId) return state;
      return {
        ...state,
        streamId: action.streamId,
        latestSequence: Math.max(state.latestSequence, action.cursor),
        backendDataMode: action.dataMode,
        snapshot: action.snapshot,
        snapshotHistory: boundedHistory(state.snapshotHistory, action.snapshot),
        lastUpdatedAt: action.snapshot.snapshotAt,
        errorMessage: null,
      };
    case 'DOMAIN_EVENT': {
      if (
        state.snapshot === null ||
        state.streamId !== action.event.streamId ||
        action.event.sequence <= state.latestSequence
      ) {
        return state;
      }
      const snapshot = applyDomainEvent(state.snapshot, action.event);
      const alerts =
        action.event.eventType === 'ALERT_UPSERTED'
          ? replaceById(state.alerts, action.event.payload, (alert) => alert.id)
          : state.alerts;
      const logs =
        action.event.eventType === 'LOG_APPENDED'
          ? replaceById(state.logs, action.event.payload, (log) => log.id)
              .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
              .slice(0, MAX_LOGS)
          : state.logs;
      const backendDataMode =
        action.event.eventType === 'SYSTEM_CONNECTION_UPDATED'
          ? action.event.payload.dataMode
          : state.backendDataMode;
      return {
        ...state,
        snapshot,
        alerts,
        logs,
        backendDataMode,
        latestSequence: action.event.sequence,
        lastUpdatedAt: action.event.occurredAt,
        snapshotHistory: boundedHistory(state.snapshotHistory, snapshot),
        errorMessage: null,
      };
    }
    case 'RESYNC_REQUIRED':
      return { ...state, errorMessage: action.message };
    case 'TRANSPORT_CLOSED':
      return {
        ...state,
        transportStatus: action.reconnecting ? 'RECONNECTING' : 'DISCONNECTED',
        errorMessage: action.reconnecting ? null : state.errorMessage,
      };
    case 'SERVER_ERROR':
      return { ...state, errorMessage: action.message };
  }
}
