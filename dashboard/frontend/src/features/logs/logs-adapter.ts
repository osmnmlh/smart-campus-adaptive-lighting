import { DataSource, DataSourceSchema, EventLogSchema } from '@smart-campus/contracts';
import {
  ACTIVITY_ENTITIES,
  isKnownActivityEntity,
  type ActivityAdapterError,
  type ActivityAdapterResult,
} from '@/features/activity/activity-model';
import { LOG_CATEGORIES, LOG_LEVELS, type LogRecord } from './logs-model';

const failure = (
  code: ActivityAdapterError['code'],
  message: string,
  recordId: string | null,
): ActivityAdapterResult<LogRecord> => ({ ok: false, error: { code, message, recordId } });

const recordIdFrom = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null || !('id' in value)) return null;
  return typeof value.id === 'string' ? value.id : null;
};

function categoryFor(eventType: string, entityType: string): LogRecord['category'] {
  if (eventType.includes('ALERT')) return 'ALERT';
  if (eventType.includes('SCENARIO')) return 'SCENARIO';
  if (eventType.includes('DIRECTION')) return 'DIRECTION';
  if (entityType === 'LAMP') return 'LAMP';
  if (entityType === 'SENSOR') return 'SENSOR';
  if (entityType === 'NODE') return 'NODE';
  return 'SYSTEM';
}

export function adaptLogs(
  input: readonly unknown[],
  options: Readonly<{ live?: boolean }> = {},
): ActivityAdapterResult<LogRecord> {
  const records: LogRecord[] = [];
  const ids = new Set<string>();

  for (const [recordIndex, raw] of input.entries()) {
    const parsed = EventLogSchema.safeParse(raw);
    const rawId = recordIdFrom(raw);
    if (!parsed.success) {
      return failure('INVALID_RECORD', 'A simulated log record failed runtime validation.', rawId);
    }

    const event = parsed.data;
    if (ids.has(event.id)) {
      return failure('DUPLICATE_ID', 'Simulated log IDs must be unique.', event.id);
    }
    ids.add(event.id);

    const entity = ACTIVITY_ENTITIES.find(
      (candidate) =>
        candidate.entityId === event.source.entityId &&
        candidate.entityType === event.source.entityType,
    );
    if (!isKnownActivityEntity(event.source.entityId) || entity === undefined) {
      return failure('UNKNOWN_ENTITY', 'The simulated log references an unknown entity.', event.id);
    }

    if (!Number.isFinite(Date.parse(event.timestamp))) {
      return failure('INVALID_TIMESTAMP', 'The simulated log timestamp is invalid.', event.id);
    }

    const metadata = event.metadata as Readonly<Record<string, unknown>>;
    const fallbackCategory = categoryFor(event.eventType, event.source.entityType);
    const category = metadata.category ?? (options.live ? fallbackCategory : undefined);
    const fallbackLevel =
      event.severity === 'CRITICAL' ? 'ERROR' : event.severity === 'WARNING' ? 'WARNING' : 'INFO';
    const level = metadata.level ?? (options.live ? fallbackLevel : undefined);
    const sequence = metadata.sequence;
    const details = metadata.details ?? (options.live ? event.message : undefined);
    const parsedDataSource = DataSourceSchema.safeParse(metadata.dataSource);
    if (typeof category !== 'string' || !(LOG_CATEGORIES as readonly string[]).includes(category)) {
      return failure('UNKNOWN_CATEGORY', 'The simulated log category is not supported.', event.id);
    }
    if (typeof level !== 'string' || !(LOG_LEVELS as readonly string[]).includes(level)) {
      return failure('UNKNOWN_LEVEL', 'The simulated log level is not supported.', event.id);
    }
    if (
      (!options.live && (typeof sequence !== 'number' || !Number.isSafeInteger(sequence))) ||
      typeof details !== 'string' ||
      details.trim().length === 0 ||
      (!options.live && metadata.dataSource !== DataSource.SIMULATED)
    ) {
      return failure('INVALID_RECORD', 'Simulated log presentation metadata is invalid.', event.id);
    }

    records.push({
      id: event.id,
      timestamp: event.timestamp,
      sequence:
        typeof sequence === 'number' && Number.isSafeInteger(sequence) ? sequence : recordIndex,
      category: category as LogRecord['category'],
      level: level as LogRecord['level'],
      eventType: event.eventType,
      entityType: event.source.entityType,
      entityId: event.source.entityId,
      scenarioId: event.scenarioRunId ?? null,
      summary: event.message,
      details,
      dataSource: parsedDataSource.success
        ? parsedDataSource.data
        : options.live
          ? DataSource.MEASURED
          : DataSource.SIMULATED,
    });
  }

  return { ok: true, records };
}
