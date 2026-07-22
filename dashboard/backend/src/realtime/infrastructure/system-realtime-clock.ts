import { Injectable } from '@nestjs/common';
import { UtcTimestampSchema, type UtcTimestamp } from '@smart-campus/contracts';

import type { RealtimeClock } from '../domain/realtime-ports.js';

@Injectable()
export class SystemRealtimeClock implements RealtimeClock {
  now(): UtcTimestamp {
    return UtcTimestampSchema.parse(new Date().toISOString());
  }
}
