import { Controller, Get, Param, Query } from '@nestjs/common';
import type { EventLog } from '@smart-campus/contracts';

import type { ApiResponse, ListApiMeta } from '../../common/http/api-response.js';
import { parseLogId } from '../../common/validation/identifier-validation.js';
import { parseLogListQuery } from '../read-model/application/read-query.parsers.js';
import { GetLogService, ListLogsService } from '../read-model/application/read-services.js';

@Controller('api/v1/logs')
export class LogsReadController {
  constructor(
    private readonly listLogs: ListLogsService,
    private readonly getLog: GetLogService,
  ) {}

  @Get()
  list(@Query() query: Record<string, unknown>): ApiResponse<readonly EventLog[], ListApiMeta> {
    return this.listLogs.execute(parseLogListQuery(query));
  }

  @Get(':logId')
  get(@Param('logId') logId: string): ApiResponse<EventLog> {
    return this.getLog.execute(parseLogId(logId));
  }
}
