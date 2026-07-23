import { Inject, Injectable, Logger } from '@nestjs/common';
import type { BeforeApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { MQTT_BACKEND_SUBSCRIPTIONS } from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import {
  MQTT_CLIENT,
  MQTT_CONFIG,
  MQTT_LIVENESS_SCHEDULER,
  type LivenessSchedulerPort,
  type MqttClientPort,
  type MqttConnectionState,
  type MqttSubscription,
} from '../domain/mqtt-ports.js';
import { MqttIngestionService } from './mqtt-ingestion.service.js';
import { MqttRuntimeStateService } from './mqtt-runtime-state.service.js';
import { NodeLivenessService } from './node-liveness.service.js';

const subscriptions: readonly MqttSubscription[] = MQTT_BACKEND_SUBSCRIPTIONS.map(
  (topicFilter) => ({ topicFilter, qos: 1 }),
);

@Injectable()
export class MqttLifecycleService implements OnModuleInit, BeforeApplicationShutdown {
  private readonly logger = new Logger(MqttLifecycleService.name);
  private unsubscribeMessage: (() => void) | null = null;
  private unsubscribeConnection: (() => void) | null = null;

  constructor(
    @Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig,
    @Inject(MQTT_CLIENT) private readonly client: MqttClientPort,
    @Inject(MQTT_LIVENESS_SCHEDULER) private readonly scheduler: LivenessSchedulerPort,
    private readonly ingestion: MqttIngestionService,
    private readonly liveness: NodeLivenessService,
    private readonly runtimeState: MqttRuntimeStateService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.runtimeState.initialize();
    if (!this.config.mqttEnabled) return;
    this.unsubscribeMessage = this.client.onMessage((message) => {
      this.ingestion.ingest(message);
    });
    this.unsubscribeConnection = this.client.onConnectionState((state) => {
      this.handleConnectionState(state);
    });
    this.scheduler.start(() => this.liveness.sweep());
    try {
      await this.client.start();
    } catch {
      this.logger.warn('MQTT client start failed; HTTP and WebSocket remain available');
    }
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.scheduler.stop();
    this.unsubscribeMessage?.();
    this.unsubscribeConnection?.();
    this.unsubscribeMessage = null;
    this.unsubscribeConnection = null;
    try {
      await this.client.stop();
    } catch {
      this.logger.warn('MQTT client shutdown failed');
    }
    this.runtimeState.setBrokerConnected(false);
  }

  private handleConnectionState(state: MqttConnectionState): void {
    const connected = state === 'CONNECTED';
    if (connected) this.logger.log('MQTT broker connected');
    else this.logger.warn('MQTT broker disconnected');
    this.runtimeState.setBrokerConnected(connected);
    if (connected) {
      void this.client.subscribe(subscriptions).catch(() => {
        this.logger.warn('MQTT subscriptions could not be restored');
      });
    }
  }
}
