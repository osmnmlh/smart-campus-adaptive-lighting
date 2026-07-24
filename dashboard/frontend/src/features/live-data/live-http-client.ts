import {
  AlertSchema,
  EventLogSchema,
  SystemSnapshotSchema,
  type Alert,
  type EventLog,
  type SystemSnapshot,
} from '@smart-campus/contracts';

export type InitialLiveData = Readonly<{
  snapshot: SystemSnapshot;
  alerts: readonly Alert[];
  logs: readonly EventLog[];
}>;

type Schema<T> = Readonly<{
  safeParse: (value: unknown) => { success: true; data: T } | { success: false };
}>;

function apiData(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('data' in value)) {
    throw new Error('Backend response envelope is invalid.');
  }
  return value.data;
}

async function fetchValidated<T>(url: string, schema: Schema<T>, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Backend request failed with status ${response.status}.`);

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Backend returned invalid JSON.');
  }
  const result = schema.safeParse(apiData(body));
  if (!result.success) throw new Error('Backend response payload failed contract validation.');
  return result.data;
}

function timeoutSignal(parentSignal: AbortSignal): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeoutId = window.setTimeout(abort, 8_000);
  if (parentSignal.aborted) abort();
  else parentSignal.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      parentSignal.removeEventListener('abort', abort);
    },
  };
}

export async function fetchInitialLiveData(
  httpUrl: string,
  parentSignal: AbortSignal,
): Promise<InitialLiveData> {
  const request = timeoutSignal(parentSignal);
  try {
    const [snapshot, alerts, logs] = await Promise.all([
      fetchValidated(`${httpUrl}/api/v1/system/snapshot`, SystemSnapshotSchema, request.signal),
      fetchValidated(
        `${httpUrl}/api/v1/alerts?timeRange=all&limit=100`,
        { safeParse: (value) => AlertSchema.array().safeParse(value) },
        request.signal,
      ),
      fetchValidated(
        `${httpUrl}/api/v1/logs?timeRange=all&limit=100`,
        { safeParse: (value) => EventLogSchema.array().safeParse(value) },
        request.signal,
      ),
    ]);
    return { snapshot, alerts, logs };
  } finally {
    request.cleanup();
  }
}
