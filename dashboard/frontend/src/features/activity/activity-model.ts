import { EntityType, type DataSource } from '@smart-campus/contracts';

export const ACTIVITY_WINDOW_START = '2026-06-14T20:30:00.000Z';
export const ACTIVITY_WINDOW_END = '2026-06-15T20:30:00.000Z';

export const TIME_RANGES = ['15m', '60m', '24h', 'all'] as const;
export type TimeRange = (typeof TIME_RANGES)[number];

export const ACTIVITY_ENTITIES = [
  { entityType: EntityType.SYSTEM, entityId: 'system', label: 'System' },
  { entityType: EntityType.NODE, entityId: 'node-1', label: 'NODE_1' },
  { entityType: EntityType.NODE, entityId: 'node-2', label: 'NODE_2' },
  { entityType: EntityType.NODE, entityId: 'node-3', label: 'NODE_3' },
  { entityType: EntityType.LAMP, entityId: 'lamp-1', label: 'L1' },
  { entityType: EntityType.LAMP, entityId: 'lamp-2', label: 'L2' },
  { entityType: EntityType.LAMP, entityId: 'lamp-3', label: 'L3' },
  { entityType: EntityType.LAMP, entityId: 'lamp-4', label: 'L4' },
  { entityType: EntityType.LAMP, entityId: 'lamp-5', label: 'L5' },
  { entityType: EntityType.SENSOR, entityId: 'sensor-ir-1', label: 'IR1' },
  { entityType: EntityType.SENSOR, entityId: 'sensor-ir-2', label: 'IR2' },
  { entityType: EntityType.SENSOR, entityId: 'sensor-ir-3', label: 'IR3' },
  { entityType: EntityType.SENSOR, entityId: 'sensor-ir-4', label: 'IR4' },
  { entityType: EntityType.SENSOR, entityId: 'sensor-ir-5', label: 'IR5' },
  { entityType: EntityType.SENSOR, entityId: 'sensor-bh1750-1', label: 'BH1750' },
] as const;

export type ActivityEntityId = (typeof ACTIVITY_ENTITIES)[number]['entityId'];

export type ActivityAdapterErrorCode =
  | 'INVALID_RECORD'
  | 'DUPLICATE_ID'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_STATUS'
  | 'UNKNOWN_ENTITY'
  | 'UNKNOWN_CATEGORY'
  | 'UNKNOWN_LEVEL';

export type ActivityAdapterError = Readonly<{
  code: ActivityAdapterErrorCode;
  message: string;
  recordId: string | null;
}>;

export type ActivityAdapterResult<T> =
  | Readonly<{ ok: true; records: readonly T[] }>
  | Readonly<{ ok: false; error: ActivityAdapterError }>;

export type ActivityFixture = Readonly<{
  windowStart: string;
  windowEnd: string;
  alerts: readonly unknown[];
  logs: readonly unknown[];
}>;

export type ActivityDataSource = Extract<DataSource, 'SIMULATED'>;

export const isKnownActivityEntity = (entityId: unknown): entityId is ActivityEntityId =>
  typeof entityId === 'string' && ACTIVITY_ENTITIES.some((entity) => entity.entityId === entityId);

export const getActivityEntityLabel = (entityId: string): string =>
  ACTIVITY_ENTITIES.find((entity) => entity.entityId === entityId)?.label ?? entityId;

export const isTimeRange = (value: unknown): value is TimeRange =>
  typeof value === 'string' && (TIME_RANGES as readonly string[]).includes(value);

export const getTimeRangeStart = (range: TimeRange, windowEnd: string): number | null => {
  if (range === 'all') return null;
  const durationMs =
    range === '15m' ? 15 * 60_000 : range === '60m' ? 60 * 60_000 : 24 * 60 * 60_000;
  return Date.parse(windowEnd) - durationMs;
};
