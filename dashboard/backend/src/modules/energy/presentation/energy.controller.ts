import { Controller, Get } from '@nestjs/common';
import { DataSource, type EnergyAnalyticsSummary } from '@smart-campus/contracts';

import type { ApiResponse } from '../../../common/http/api-response.js';
import { EnergyAnalyticsService } from '../application/energy-analytics.service.js';

@Controller('api/v1/energy')
export class EnergyController {
  constructor(private readonly energyAnalytics: EnergyAnalyticsService) {}

  @Get('summary')
  getSummary(): ApiResponse<EnergyAnalyticsSummary> {
    const data = this.energyAnalytics.getSummary();
    return {
      data,
      meta: {
        asOf: data.calculatedAt,
        dataSource: DataSource.CALCULATED,
        deterministic: false,
      },
    };
  }
}
