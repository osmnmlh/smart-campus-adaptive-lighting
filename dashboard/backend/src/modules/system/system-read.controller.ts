import { Controller, Get } from '@nestjs/common';
import type { SystemSnapshot } from '@smart-campus/contracts';

import type { ApiResponse } from '../../common/http/api-response.js';
import { GetSystemSnapshotService } from '../read-model/application/read-services.js';

@Controller('api/v1/system')
export class SystemReadController {
  constructor(private readonly getSystemSnapshot: GetSystemSnapshotService) {}

  @Get('snapshot')
  getSnapshot(): ApiResponse<SystemSnapshot> {
    return this.getSystemSnapshot.execute();
  }
}
