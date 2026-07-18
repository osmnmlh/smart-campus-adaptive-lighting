import type {
  Alert,
  AlertSeverity,
  AlertStatus,
  EventLog,
  ScenarioDefinition,
} from '@smart-campus/contracts';

import type { Pagination } from '../../../common/pagination/pagination-model.js';

export const FIXED_AS_OF = '2026-06-15T20:30:00.000Z';
export const ACTIVITY_WINDOW_START = '2026-06-14T20:30:00.000Z';
export const TIME_RANGES = ['15m', '60m', '24h', 'all'] as const;
export const LOG_CATEGORIES = [
  'SYSTEM',
  'SCENARIO',
  'SENSOR',
  'DIRECTION',
  'LAMP',
  'NODE',
  'ALERT',
] as const;
export const LOG_LEVELS = ['INFO', 'WARNING', 'ERROR'] as const;
export const ACTIVITY_ENTITY_IDS = [
  'system',
  'node-1',
  'node-2',
  'node-3',
  'lamp-1',
  'lamp-2',
  'lamp-3',
  'lamp-4',
  'lamp-5',
  'sensor-ir-1',
  'sensor-ir-2',
  'sensor-ir-3',
  'sensor-ir-4',
  'sensor-ir-5',
  'sensor-bh1750-1',
] as const;

export type TimeRange = (typeof TIME_RANGES)[number];
export type LogCategory = (typeof LOG_CATEGORIES)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];
export type ActivityEntityId = (typeof ACTIVITY_ENTITY_IDS)[number];

export interface AlertListQuery extends Pagination {
  severity?: AlertSeverity;
  status?: AlertStatus;
  entityId?: ActivityEntityId;
  timeRange: TimeRange;
}

export interface LogListQuery extends Pagination {
  category?: LogCategory;
  level?: LogLevel;
  entityId?: ActivityEntityId;
  timeRange: TimeRange;
}

export interface ScenarioReadModel {
  id: string;
  title: string;
  description: string;
  durationMs: number;
  eventCount: number;
  expectedOutcome: string;
  simulated: true;
  initialVirtualTimestamp: string;
  definition: ScenarioDefinition;
}

export const getMetadataString = (record: EventLog, key: string): string | null => {
  const value = record.metadata[key];
  return typeof value === 'string' ? value : null;
};

export const getMetadataSequence = (record: Alert | EventLog): number => {
  const value = record.metadata.sequence;
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : 0;
};
