import { Injectable } from '@nestjs/common';
import type { Alert, EventLog, SystemSnapshot } from '@smart-campus/contracts';

import type {
  AlertReadRepository,
  LogReadRepository,
  ScenarioReadRepository,
  SnapshotReadRepository,
} from '../../domain/read-repositories.js';
import type { ScenarioReadModel } from '../../domain/read-model-models.js';
import { DeterministicReadFixture } from './deterministic-read-fixture.js';

@Injectable()
export class InMemorySnapshotReadRepository implements SnapshotReadRepository {
  constructor(private readonly fixture: DeterministicReadFixture) {}

  getCurrentSnapshot(): SystemSnapshot {
    return this.fixture.getSnapshot();
  }
}

@Injectable()
export class InMemoryAlertReadRepository implements AlertReadRepository {
  constructor(private readonly fixture: DeterministicReadFixture) {}

  list(): readonly Alert[] {
    return this.fixture.getAlerts();
  }

  findById(id: string): Alert | null {
    return this.fixture.getAlerts().find((alert) => alert.id === id) ?? null;
  }
}

@Injectable()
export class InMemoryLogReadRepository implements LogReadRepository {
  constructor(private readonly fixture: DeterministicReadFixture) {}

  list(): readonly EventLog[] {
    return this.fixture.getLogs();
  }

  findById(id: string): EventLog | null {
    return this.fixture.getLogs().find((log) => log.id === id) ?? null;
  }
}

@Injectable()
export class InMemoryScenarioReadRepository implements ScenarioReadRepository {
  constructor(private readonly fixture: DeterministicReadFixture) {}

  list(): readonly ScenarioReadModel[] {
    return this.fixture.getScenarios();
  }

  findById(id: string): ScenarioReadModel | null {
    return this.fixture.getScenarios().find((scenario) => scenario.id === id) ?? null;
  }
}
