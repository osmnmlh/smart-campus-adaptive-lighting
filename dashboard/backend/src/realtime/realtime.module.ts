import { Module } from '@nestjs/common';

import { loadEnvironment } from '../common/config/environment.js';
import { ReadModelModule } from '../modules/read-model/read-model.module.js';
import { RealtimeSnapshotService } from './application/realtime-snapshot.service.js';
import { RealtimeStreamService } from './application/realtime-stream.service.js';
import {
  REALTIME_CLOCK,
  REALTIME_CONFIG,
  REALTIME_PUBLISHER,
  REALTIME_STREAM_ID_PROVIDER,
} from './domain/realtime-ports.js';
import { RandomStreamIdProvider } from './infrastructure/random-stream-id.provider.js';
import { SystemRealtimeClock } from './infrastructure/system-realtime-clock.js';
import { RealtimeGateway } from './transport/realtime.gateway.js';

@Module({
  imports: [ReadModelModule],
  providers: [
    { provide: REALTIME_CONFIG, useFactory: loadEnvironment },
    { provide: REALTIME_CLOCK, useClass: SystemRealtimeClock },
    { provide: REALTIME_STREAM_ID_PROVIDER, useClass: RandomStreamIdProvider },
    RealtimeSnapshotService,
    RealtimeStreamService,
    { provide: REALTIME_PUBLISHER, useExisting: RealtimeStreamService },
    RealtimeGateway,
  ],
  exports: [RealtimeStreamService, REALTIME_PUBLISHER, RealtimeGateway],
})
export class RealtimeModule {}
