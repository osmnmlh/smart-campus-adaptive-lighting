import { Module } from '@nestjs/common';

import { ScenariosModule } from '../../scenarios/scenarios.module.js';
import { AlertsReadController } from '../alerts/alerts-read.controller.js';
import { LogsReadController } from '../logs/logs-read.controller.js';
import { ScenariosReadController } from '../scenarios/scenarios-read.controller.js';
import { SystemReadController } from '../system/system-read.controller.js';
import {
  GetAlertService,
  GetLogService,
  GetScenarioService,
  GetSystemSnapshotService,
  ListAlertsService,
  ListLogsService,
  ListScenariosService,
} from './application/read-services.js';
import {
  ALERT_READ_REPOSITORY,
  LOG_READ_REPOSITORY,
  SCENARIO_READ_REPOSITORY,
  SNAPSHOT_READ_REPOSITORY,
} from './domain/read-repositories.js';
import { DeterministicReadFixture } from './infrastructure/in-memory/deterministic-read-fixture.js';
import {
  InMemoryAlertReadRepository,
  InMemoryLogReadRepository,
  InMemoryScenarioReadRepository,
  InMemorySnapshotReadRepository,
} from './infrastructure/in-memory/in-memory-read-repositories.js';

@Module({
  imports: [ScenariosModule],
  controllers: [
    SystemReadController,
    AlertsReadController,
    LogsReadController,
    ScenariosReadController,
  ],
  providers: [
    DeterministicReadFixture,
    InMemorySnapshotReadRepository,
    InMemoryAlertReadRepository,
    InMemoryLogReadRepository,
    InMemoryScenarioReadRepository,
    { provide: SNAPSHOT_READ_REPOSITORY, useExisting: InMemorySnapshotReadRepository },
    { provide: ALERT_READ_REPOSITORY, useExisting: InMemoryAlertReadRepository },
    { provide: LOG_READ_REPOSITORY, useExisting: InMemoryLogReadRepository },
    { provide: SCENARIO_READ_REPOSITORY, useExisting: InMemoryScenarioReadRepository },
    GetSystemSnapshotService,
    ListAlertsService,
    GetAlertService,
    ListLogsService,
    GetLogService,
    ListScenariosService,
    GetScenarioService,
  ],
  exports: [
    DeterministicReadFixture,
    InMemorySnapshotReadRepository,
    InMemoryAlertReadRepository,
    InMemoryLogReadRepository,
    InMemoryScenarioReadRepository,
    GetSystemSnapshotService,
    ListAlertsService,
    GetAlertService,
    ListLogsService,
    GetLogService,
    ListScenariosService,
    GetScenarioService,
  ],
})
export class ReadModelModule {}
