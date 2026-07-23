import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ApiExceptionFilter } from './common/http/api-exception.filter.js';
import { HealthModule } from './health/health.module.js';
import { ReadModelModule } from './modules/read-model/read-model.module.js';
import { MqttModule } from './mqtt/mqtt.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { ScenariosModule } from './scenarios/scenarios.module.js';

@Module({
  imports: [HealthModule, ScenariosModule, ReadModelModule, RealtimeModule, MqttModule],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
