import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { RealtimeStreamIdSchema, type RealtimeStreamId } from '@smart-campus/contracts';

import type { RealtimeStreamIdProvider } from '../domain/realtime-ports.js';

@Injectable()
export class RandomStreamIdProvider implements RealtimeStreamIdProvider {
  private readonly streamId = RealtimeStreamIdSchema.parse(`WS_${randomUUID()}`);

  getStreamId(): RealtimeStreamId {
    return this.streamId;
  }
}
