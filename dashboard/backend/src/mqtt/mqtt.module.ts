import { Module } from '@nestjs/common';

import { loadEnvironment } from '../common/config/environment.js';
import { ReadModelModule } from '../modules/read-model/read-model.module.js';
import { EnergyModule } from '../modules/energy/energy.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { GatewaySequenceTracker } from './application/gateway-sequence-tracker.js';
import { MqttDiagnosticsService } from './application/mqtt-diagnostics.service.js';
import { MqttIngestionService } from './application/mqtt-ingestion.service.js';
import { MqttLifecycleService } from './application/mqtt-lifecycle.service.js';
import { MqttRuntimeStateService } from './application/mqtt-runtime-state.service.js';
import { NodeLivenessService } from './application/node-liveness.service.js';
import { NodeSequenceTracker } from './application/node-sequence-tracker.js';
import { OriginMessageDeduplicationStore } from './application/origin-message-deduplication.store.js';
import {
  MQTT_CLIENT,
  MQTT_CONFIG,
  MQTT_JS_CLIENT_FACTORY,
  MQTT_LIVENESS_SCHEDULER,
} from './domain/mqtt-ports.js';
import { IntervalLivenessScheduler } from './infrastructure/interval-liveness-scheduler.js';
import { MqttJsClientAdapter } from './infrastructure/mqtt-js-client.adapter.js';
import { MqttJsClientFactory } from './infrastructure/mqtt-js-client.factory.js';

@Module({
  imports: [ReadModelModule, RealtimeModule, EnergyModule],
  providers: [
    { provide: MQTT_CONFIG, useFactory: loadEnvironment },
    MqttJsClientFactory,
    { provide: MQTT_JS_CLIENT_FACTORY, useExisting: MqttJsClientFactory },
    MqttJsClientAdapter,
    { provide: MQTT_CLIENT, useExisting: MqttJsClientAdapter },
    IntervalLivenessScheduler,
    { provide: MQTT_LIVENESS_SCHEDULER, useExisting: IntervalLivenessScheduler },
    OriginMessageDeduplicationStore,
    NodeSequenceTracker,
    GatewaySequenceTracker,
    MqttDiagnosticsService,
    MqttRuntimeStateService,
    MqttIngestionService,
    NodeLivenessService,
    MqttLifecycleService,
  ],
  exports: [MqttIngestionService, MqttRuntimeStateService, MQTT_CLIENT],
})
export class MqttModule {}
