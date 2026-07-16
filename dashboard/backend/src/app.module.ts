import { Module } from '@nestjs/common';

import { HealthModule } from './health/health.module.js';
import { ScenariosModule } from './scenarios/scenarios.module.js';

@Module({
  imports: [HealthModule, ScenariosModule],
})
export class AppModule {}
