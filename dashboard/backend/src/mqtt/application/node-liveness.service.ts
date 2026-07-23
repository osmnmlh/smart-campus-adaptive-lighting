import { Inject, Injectable, Logger } from '@nestjs/common';
import { COMMUNICATION_POLICY_V1 } from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import {
  LIVE_READ_MODEL_UPDATE,
  type LiveReadModelUpdatePort,
} from '../../modules/read-model/domain/live-read-model-update.port.js';
import {
  REALTIME_CLOCK,
  REALTIME_PUBLISHER,
  type RealtimeClock,
  type RealtimePublisherPort,
} from '../../realtime/domain/realtime-ports.js';
import { MQTT_CONFIG } from '../domain/mqtt-ports.js';
import { MqttDiagnosticsService } from './mqtt-diagnostics.service.js';
import { MqttRuntimeStateService } from './mqtt-runtime-state.service.js';
import { NodeSequenceTracker } from './node-sequence-tracker.js';

@Injectable()
export class NodeLivenessService {
  private readonly logger = new Logger(NodeLivenessService.name);

  constructor(
    @Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig,
    @Inject(REALTIME_CLOCK) private readonly clock: RealtimeClock,
    private readonly tracker: NodeSequenceTracker,
    @Inject(LIVE_READ_MODEL_UPDATE) private readonly readModel: LiveReadModelUpdatePort,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisherPort,
    private readonly runtimeState: MqttRuntimeStateService,
    private readonly diagnostics: MqttDiagnosticsService,
  ) {}

  sweep(): void {
    if (!this.config.mqttEnabled) return;
    const now = this.clock.now();
    const nowMs = Date.parse(now);
    for (const state of this.tracker.listStates()) {
      if (
        state.online &&
        nowMs - Date.parse(state.lastAcceptedAt) >= COMMUNICATION_POLICY_V1.offlineTimeoutMs
      ) {
        const offline = this.tracker.markOffline(state.nodeId);
        if (offline === null) continue;
        const node = this.readModel.markNodeOffline(state.nodeId, now);
        this.runtimeState.setNodeOnline(state.nodeId, false);
        try {
          this.publisher.publish({ eventType: 'NODE_UPDATED', payload: node });
        } catch {
          this.logger.warn('Realtime node-offline publication failed');
        }
        this.diagnostics.nodeOffline(state.nodeId, now);
      }
    }
  }
}
