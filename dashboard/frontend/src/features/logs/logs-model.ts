import type { DataSource, EntityType, EventType } from '@smart-campus/contracts';
import type { TimeRange } from '@/features/activity/activity-model';

export const LOG_CATEGORIES = [
  'SYSTEM',
  'SCENARIO',
  'SENSOR',
  'DIRECTION',
  'LAMP',
  'NODE',
  'ALERT',
] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

export const LOG_LEVELS = ['INFO', 'WARNING', 'ERROR'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogRecord = Readonly<{
  id: string;
  timestamp: string;
  sequence: number;
  category: LogCategory;
  level: LogLevel;
  eventType: EventType;
  entityType: EntityType;
  entityId: string;
  scenarioId: string | null;
  summary: string;
  details: string;
  dataSource: DataSource;
}>;

export type LogFilters = Readonly<{
  category: 'ALL' | LogCategory;
  level: 'ALL' | LogLevel;
  entityId: 'ALL' | string;
  timeRange: TimeRange;
}>;

export const DEFAULT_LOG_FILTERS: LogFilters = {
  category: 'ALL',
  level: 'ALL',
  entityId: 'ALL',
  timeRange: 'all',
};

export type LogSummary = Readonly<{
  totalLogs: number;
  infoLogs: number;
  warningLogs: number;
  errorLogs: number;
  latestLogTimestamp: string | null;
}>;
