import { Injectable } from '@nestjs/common';
import { SystemSnapshotSchema, type SystemSnapshot } from '@smart-campus/contracts';

import { GetSystemSnapshotService } from '../../modules/read-model/application/read-services.js';

@Injectable()
export class RealtimeSnapshotService {
  constructor(private readonly getSystemSnapshotService: GetSystemSnapshotService) {}

  getCurrentSnapshot(): SystemSnapshot {
    return SystemSnapshotSchema.parse(this.getSystemSnapshotService.execute().data);
  }
}
