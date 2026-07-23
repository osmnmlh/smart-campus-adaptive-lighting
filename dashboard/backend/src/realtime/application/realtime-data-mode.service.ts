import { Inject, Injectable } from '@nestjs/common';
import { RealtimeDataModeSchema, type RealtimeDataMode } from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import { REALTIME_CONFIG, type RealtimeDataModePort } from '../domain/realtime-ports.js';

@Injectable()
export class RealtimeDataModeService implements RealtimeDataModePort {
  private dataMode: RealtimeDataMode;

  constructor(@Inject(REALTIME_CONFIG) config: EnvironmentConfig) {
    this.dataMode = config.mqttEnabled ? 'DISCONNECTED' : 'SIMULATED';
  }

  getDataMode(): RealtimeDataMode {
    return this.dataMode;
  }

  setDataMode(dataMode: RealtimeDataMode): void {
    this.dataMode = RealtimeDataModeSchema.parse(dataMode);
  }
}
