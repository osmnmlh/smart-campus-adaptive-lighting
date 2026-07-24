import { Module } from '@nestjs/common';

import { loadEnvironment } from '../../common/config/environment.js';
import { RealtimeModule } from '../../realtime/realtime.module.js';
import { ReadModelModule } from '../read-model/read-model.module.js';
import { EnergyAnalyticsService } from './application/energy-analytics.service.js';
import { ENERGY_CONFIG } from './domain/energy-ports.js';
import { EnergyController } from './presentation/energy.controller.js';

@Module({
  imports: [ReadModelModule, RealtimeModule],
  controllers: [EnergyController],
  providers: [{ provide: ENERGY_CONFIG, useFactory: loadEnvironment }, EnergyAnalyticsService],
  exports: [EnergyAnalyticsService],
})
export class EnergyModule {}
