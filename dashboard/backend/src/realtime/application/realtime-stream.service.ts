import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RealtimeDomainEventDraftV1Schema,
  RealtimeDomainEventV1Schema,
  RealtimeStreamIdSchema,
  type RealtimeCursor,
  type RealtimeDomainEventDraftV1,
  type RealtimeDomainEventV1,
  type RealtimeStreamId,
} from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import {
  REALTIME_CLOCK,
  REALTIME_CONFIG,
  REALTIME_STREAM_ID_PROVIDER,
  type RealtimeClock,
  type RealtimeEventListener,
  type RealtimePublisherPort,
  type RealtimeReplayResult,
  type RealtimeStreamIdProvider,
} from '../domain/realtime-ports.js';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

@Injectable()
export class RealtimeStreamService implements RealtimePublisherPort {
  private readonly logger = new Logger(RealtimeStreamService.name);
  private readonly streamId: RealtimeStreamId;
  private readonly replayBuffer: RealtimeDomainEventV1[] = [];
  private readonly listeners = new Set<RealtimeEventListener>();
  private cursor: RealtimeCursor = 0;

  constructor(
    @Inject(REALTIME_CLOCK) private readonly clock: RealtimeClock,
    @Inject(REALTIME_STREAM_ID_PROVIDER) streamIdProvider: RealtimeStreamIdProvider,
    @Inject(REALTIME_CONFIG) private readonly config: EnvironmentConfig,
  ) {
    this.streamId = RealtimeStreamIdSchema.parse(streamIdProvider.getStreamId());
  }

  publish(draft: RealtimeDomainEventDraftV1): RealtimeDomainEventV1 {
    if (this.cursor >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Realtime stream sequence is exhausted');
    }

    const safeDraft = RealtimeDomainEventDraftV1Schema.parse(clone(draft));
    const sequence = this.cursor + 1;
    const event = RealtimeDomainEventV1Schema.parse({
      messageType: 'DOMAIN_EVENT',
      protocolVersion: 1,
      streamId: this.streamId,
      sequence,
      eventId: `${this.streamId}:${sequence}`,
      occurredAt: this.clock.now(),
      ...safeDraft,
    });

    this.cursor = sequence;
    this.replayBuffer.push(clone(event));
    if (this.replayBuffer.length > this.config.websocketReplayCapacity) {
      this.replayBuffer.splice(0, this.replayBuffer.length - this.config.websocketReplayCapacity);
    }

    for (const listener of [...this.listeners]) {
      try {
        listener(clone(event));
      } catch {
        this.logger.warn('Realtime subscriber failed while handling an event');
      }
    }

    return clone(event);
  }

  getStreamId(): RealtimeStreamId {
    return this.streamId;
  }

  getCurrentCursor(): RealtimeCursor {
    return this.cursor;
  }

  replayAfter(afterSequence: RealtimeCursor): RealtimeReplayResult {
    if (afterSequence > this.cursor) return { kind: 'CURSOR_AHEAD' };
    if (afterSequence === this.cursor) return { kind: 'REPLAY', events: [] };

    const oldestSequence = this.replayBuffer[0]?.sequence;
    if (oldestSequence === undefined || afterSequence < oldestSequence - 1) {
      return { kind: 'CURSOR_TOO_OLD' };
    }

    return {
      kind: 'REPLAY',
      events: this.replayBuffer
        .filter((event) => event.sequence > afterSequence)
        .map((event) => clone(event)),
    };
  }

  subscribe(listener: RealtimeEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
