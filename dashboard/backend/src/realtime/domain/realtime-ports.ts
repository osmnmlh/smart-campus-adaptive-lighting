import type {
  RealtimeCursor,
  RealtimeDomainEventDraftV1,
  RealtimeDomainEventV1,
  RealtimeStreamId,
  UtcTimestamp,
} from '@smart-campus/contracts';

export const REALTIME_CLOCK = Symbol('REALTIME_CLOCK');
export const REALTIME_STREAM_ID_PROVIDER = Symbol('REALTIME_STREAM_ID_PROVIDER');
export const REALTIME_PUBLISHER = Symbol('REALTIME_PUBLISHER');
export const REALTIME_CONFIG = Symbol('REALTIME_CONFIG');

export interface RealtimeClock {
  now(): UtcTimestamp;
}

export interface RealtimeStreamIdProvider {
  getStreamId(): RealtimeStreamId;
}

export type RealtimeEventListener = (event: RealtimeDomainEventV1) => void;

export type RealtimeReplayResult =
  | { kind: 'REPLAY'; events: readonly RealtimeDomainEventV1[] }
  | { kind: 'CURSOR_TOO_OLD' }
  | { kind: 'CURSOR_AHEAD' };

export interface RealtimePublisherPort {
  publish(draft: RealtimeDomainEventDraftV1): RealtimeDomainEventV1;
  getStreamId(): RealtimeStreamId;
  getCurrentCursor(): RealtimeCursor;
  replayAfter(afterSequence: RealtimeCursor): RealtimeReplayResult;
  subscribe(listener: RealtimeEventListener): () => void;
}
