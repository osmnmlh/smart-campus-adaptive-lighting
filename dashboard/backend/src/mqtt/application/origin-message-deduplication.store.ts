import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import { MQTT_CONFIG } from '../domain/mqtt-ports.js';

export type DeduplicationInspection =
  | { kind: 'NEW'; fingerprint: string }
  | { kind: 'DUPLICATE'; fingerprint: string }
  | { kind: 'CONFLICT'; fingerprint: string };

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (typeof value !== 'object' || value === null) return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  );
};

export const buildCanonicalFingerprint = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');

@Injectable()
export class OriginMessageDeduplicationStore {
  private readonly entries = new Map<string, string>();

  constructor(@Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig) {}

  inspect(messageId: string, canonicalPayload: unknown): DeduplicationInspection {
    const fingerprint = buildCanonicalFingerprint(canonicalPayload);
    const existing = this.entries.get(messageId);
    if (existing === undefined) return { kind: 'NEW', fingerprint };
    return existing === fingerprint
      ? { kind: 'DUPLICATE', fingerprint }
      : { kind: 'CONFLICT', fingerprint };
  }

  remember(messageId: string, fingerprint: string): void {
    if (this.entries.has(messageId)) return;
    while (this.entries.size >= this.config.mqttDedupCapacity) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    this.entries.set(messageId, fingerprint);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
