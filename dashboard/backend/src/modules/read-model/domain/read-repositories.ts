import type { Alert, EventLog, SystemSnapshot } from '@smart-campus/contracts';

import type { ScenarioReadModel } from './read-model-models.js';

export interface SnapshotReadRepository {
  getCurrentSnapshot(): SystemSnapshot;
}

export interface AlertReadRepository {
  list(): readonly Alert[];
  findById(id: string): Alert | null;
}

export interface LogReadRepository {
  list(): readonly EventLog[];
  findById(id: string): EventLog | null;
}

export interface ScenarioReadRepository {
  list(): readonly ScenarioReadModel[];
  findById(id: string): ScenarioReadModel | null;
}

export const SNAPSHOT_READ_REPOSITORY = Symbol('SNAPSHOT_READ_REPOSITORY');
export const ALERT_READ_REPOSITORY = Symbol('ALERT_READ_REPOSITORY');
export const LOG_READ_REPOSITORY = Symbol('LOG_READ_REPOSITORY');
export const SCENARIO_READ_REPOSITORY = Symbol('SCENARIO_READ_REPOSITORY');
