import { AlertSchema, DataSource } from '@smart-campus/contracts';
import {
  ACTIVITY_ENTITIES,
  isKnownActivityEntity,
  type ActivityAdapterError,
  type ActivityAdapterResult,
} from '@/features/activity/activity-model';
import type { AlertRecord } from './alerts-model';

const failure = (
  code: ActivityAdapterError['code'],
  message: string,
  recordId: string | null,
): ActivityAdapterResult<AlertRecord> => ({ ok: false, error: { code, message, recordId } });

const recordIdFrom = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null || !('id' in value)) return null;
  return typeof value.id === 'string' ? value.id : null;
};

const metadataString = (metadata: Readonly<Record<string, unknown>>, key: string): string | null =>
  typeof metadata[key] === 'string' ? metadata[key] : null;

const metadataNullableString = (
  metadata: Readonly<Record<string, unknown>>,
  key: string,
): string | null | undefined => {
  const value = metadata[key];
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
};

export function adaptAlerts(input: readonly unknown[]): ActivityAdapterResult<AlertRecord> {
  const records: AlertRecord[] = [];
  const ids = new Set<string>();

  for (const raw of input) {
    const parsed = AlertSchema.safeParse(raw);
    const rawId = recordIdFrom(raw);
    if (!parsed.success) {
      return failure(
        'INVALID_RECORD',
        'A simulated alert record failed runtime validation.',
        rawId,
      );
    }

    const alert = parsed.data;
    if (ids.has(alert.id)) {
      return failure('DUPLICATE_ID', 'Simulated alert IDs must be unique.', alert.id);
    }
    ids.add(alert.id);

    const entity = ACTIVITY_ENTITIES.find(
      (candidate) =>
        candidate.entityId === alert.sourceEntity.entityId &&
        candidate.entityType === alert.sourceEntity.entityType,
    );
    if (!isKnownActivityEntity(alert.sourceEntity.entityId) || entity === undefined) {
      return failure(
        'UNKNOWN_ENTITY',
        'The simulated alert references an unknown entity.',
        alert.id,
      );
    }

    const startedAtMs = Date.parse(alert.startedAt);
    const lastObservedAtMs = Date.parse(alert.lastObservedAt);
    const resolvedAtMs = alert.resolvedAt === undefined ? null : Date.parse(alert.resolvedAt);
    if (
      !Number.isFinite(startedAtMs) ||
      !Number.isFinite(lastObservedAtMs) ||
      lastObservedAtMs < startedAtMs ||
      (resolvedAtMs !== null && (!Number.isFinite(resolvedAtMs) || resolvedAtMs < startedAtMs))
    ) {
      return failure(
        'INVALID_TIMESTAMP',
        'Simulated alert timestamps are not chronological.',
        alert.id,
      );
    }

    if (
      (alert.status === 'ACTIVE' && alert.resolvedAt !== undefined) ||
      (alert.status === 'RESOLVED' && alert.resolvedAt === undefined)
    ) {
      return failure(
        'INVALID_STATUS',
        'Alert status and resolved timestamp do not agree.',
        alert.id,
      );
    }

    const metadata = alert.metadata as Readonly<Record<string, unknown>>;
    const title = metadataString(metadata, 'title');
    const description = metadataString(metadata, 'description');
    const scenarioId = metadataNullableString(metadata, 'scenarioId');
    const sequence = metadata.sequence;
    if (
      title === null ||
      description === null ||
      scenarioId === undefined ||
      typeof sequence !== 'number' ||
      !Number.isSafeInteger(sequence) ||
      metadata.dataSource !== DataSource.SIMULATED
    ) {
      return failure(
        'INVALID_RECORD',
        'Simulated alert presentation metadata is invalid.',
        alert.id,
      );
    }

    records.push({
      id: alert.id,
      code: alert.code,
      title,
      description,
      severity: alert.severity,
      status: alert.status,
      entityType: alert.sourceEntity.entityType,
      entityId: alert.sourceEntity.entityId,
      createdAt: alert.startedAt,
      resolvedAt: alert.resolvedAt ?? null,
      scenarioId,
      dataSource: DataSource.SIMULATED,
      sequence,
      probableCause: alert.probableCause,
      recommendedAction: alert.recommendedAction,
    });
  }

  return { ok: true, records };
}
