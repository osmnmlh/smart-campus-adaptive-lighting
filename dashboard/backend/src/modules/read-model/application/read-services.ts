import { Inject, Injectable } from '@nestjs/common';
import {
  DataSource,
  type Alert,
  type EventLog,
  type SystemSnapshot,
} from '@smart-campus/contracts';

import { notFound } from '../../../common/http/api-errors.js';
import type { ApiMeta, ApiResponse, ListApiMeta } from '../../../common/http/api-response.js';
import {
  ALERT_READ_REPOSITORY,
  type AlertReadRepository,
  LOG_READ_REPOSITORY,
  type LogReadRepository,
  SCENARIO_READ_REPOSITORY,
  type ScenarioReadRepository,
  SNAPSHOT_READ_REPOSITORY,
  type SnapshotReadRepository,
} from '../domain/read-repositories.js';
import {
  FIXED_AS_OF,
  getMetadataSequence,
  getMetadataString,
  type AlertListQuery,
  type LogListQuery,
  type ScenarioReadModel,
  type TimeRange,
} from '../domain/read-model-models.js';

const baseMeta = (): ApiMeta => ({
  asOf: FIXED_AS_OF,
  dataSource: DataSource.SIMULATED,
  deterministic: true,
});

const timeRangeStart = (timeRange: TimeRange): number | null => {
  if (timeRange === 'all') return null;
  const duration =
    timeRange === '15m' ? 15 * 60_000 : timeRange === '60m' ? 60 * 60_000 : 24 * 60 * 60_000;
  return Date.parse(FIXED_AS_OF) - duration;
};

const listMeta = (
  total: number,
  filteredCount: number,
  offset: number,
  limit: number,
  returnedCount: number,
): ListApiMeta => ({
  ...baseMeta(),
  total,
  filteredCount,
  offset,
  limit,
  returnedCount,
  hasMore: offset + returnedCount < filteredCount,
});

@Injectable()
export class GetSystemSnapshotService {
  constructor(
    @Inject(SNAPSHOT_READ_REPOSITORY) private readonly repository: SnapshotReadRepository,
  ) {}

  execute(): ApiResponse<SystemSnapshot> {
    return { data: this.repository.getCurrentSnapshot(), meta: baseMeta() };
  }
}

@Injectable()
export class ListAlertsService {
  constructor(@Inject(ALERT_READ_REPOSITORY) private readonly repository: AlertReadRepository) {}

  execute(query: AlertListQuery): ApiResponse<readonly Alert[], ListApiMeta> {
    const all = this.repository.list();
    const start = timeRangeStart(query.timeRange);
    const filtered = [...all]
      .filter((alert) => query.severity === undefined || alert.severity === query.severity)
      .filter((alert) => query.status === undefined || alert.status === query.status)
      .filter(
        (alert) => query.entityId === undefined || alert.sourceEntity.entityId === query.entityId,
      )
      .filter((alert) => start === null || Date.parse(alert.startedAt) >= start)
      .sort(
        (left, right) =>
          Date.parse(right.startedAt) - Date.parse(left.startedAt) ||
          getMetadataSequence(right) - getMetadataSequence(left),
      );
    const data = filtered.slice(query.offset, query.offset + query.limit);
    return {
      data,
      meta: listMeta(all.length, filtered.length, query.offset, query.limit, data.length),
    };
  }
}

@Injectable()
export class GetAlertService {
  constructor(@Inject(ALERT_READ_REPOSITORY) private readonly repository: AlertReadRepository) {}

  execute(alertId: string): ApiResponse<Alert> {
    const alert = this.repository.findById(alertId);
    if (alert === null) throw notFound('alert');
    return { data: alert, meta: baseMeta() };
  }
}

@Injectable()
export class ListLogsService {
  constructor(@Inject(LOG_READ_REPOSITORY) private readonly repository: LogReadRepository) {}

  execute(query: LogListQuery): ApiResponse<readonly EventLog[], ListApiMeta> {
    const all = this.repository.list();
    const start = timeRangeStart(query.timeRange);
    const filtered = [...all]
      .filter(
        (log) =>
          query.category === undefined || getMetadataString(log, 'category') === query.category,
      )
      .filter((log) => query.level === undefined || getMetadataString(log, 'level') === query.level)
      .filter((log) => query.entityId === undefined || log.source.entityId === query.entityId)
      .filter((log) => start === null || Date.parse(log.timestamp) >= start)
      .sort(
        (left, right) =>
          Date.parse(right.timestamp) - Date.parse(left.timestamp) ||
          getMetadataSequence(right) - getMetadataSequence(left),
      );
    const data = filtered.slice(query.offset, query.offset + query.limit);
    return {
      data,
      meta: listMeta(all.length, filtered.length, query.offset, query.limit, data.length),
    };
  }
}

@Injectable()
export class GetLogService {
  constructor(@Inject(LOG_READ_REPOSITORY) private readonly repository: LogReadRepository) {}

  execute(logId: string): ApiResponse<EventLog> {
    const log = this.repository.findById(logId);
    if (log === null) throw notFound('log');
    return { data: log, meta: baseMeta() };
  }
}

@Injectable()
export class ListScenariosService {
  constructor(
    @Inject(SCENARIO_READ_REPOSITORY) private readonly repository: ScenarioReadRepository,
  ) {}

  execute(): ApiResponse<readonly ScenarioReadModel[], ListApiMeta> {
    const data = this.repository.list();
    return { data, meta: listMeta(data.length, data.length, 0, data.length, data.length) };
  }
}

@Injectable()
export class GetScenarioService {
  constructor(
    @Inject(SCENARIO_READ_REPOSITORY) private readonly repository: ScenarioReadRepository,
  ) {}

  execute(scenarioId: string): ApiResponse<ScenarioReadModel> {
    const scenario = this.repository.findById(scenarioId);
    if (scenario === null) throw notFound('scenario');
    return { data: scenario, meta: baseMeta() };
  }
}
