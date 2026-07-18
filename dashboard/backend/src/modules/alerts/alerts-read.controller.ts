import { Controller, Get, Param, Query } from '@nestjs/common';
import type { Alert } from '@smart-campus/contracts';

import type { ApiResponse, ListApiMeta } from '../../common/http/api-response.js';
import { parseAlertId } from '../../common/validation/identifier-validation.js';
import { parseAlertListQuery } from '../read-model/application/read-query.parsers.js';
import { GetAlertService, ListAlertsService } from '../read-model/application/read-services.js';

@Controller('api/v1/alerts')
export class AlertsReadController {
  constructor(
    private readonly listAlerts: ListAlertsService,
    private readonly getAlert: GetAlertService,
  ) {}

  @Get()
  list(@Query() query: Record<string, unknown>): ApiResponse<readonly Alert[], ListApiMeta> {
    return this.listAlerts.execute(parseAlertListQuery(query));
  }

  @Get(':alertId')
  get(@Param('alertId') alertId: string): ApiResponse<Alert> {
    return this.getAlert.execute(parseAlertId(alertId));
  }
}
