import { describe, expect, it } from 'vitest';
import {
  CommunicationMetricsSchema,
  ElectricalMetricsSchema,
  MetricQuality,
  MetricQualitySchema,
  TelemetrySampleSchema,
} from '../src/index.js';
import { metric, timestamp } from './fixtures.js';

describe('telemetry schemas', () => {
  it('accepts the canonical STALE metric quality', () => {
    expect(MetricQuality.STALE).toBe('STALE');
    expect(MetricQualitySchema.safeParse('STALE').success).toBe(true);
  });

  it('rejects incorrect metric quality casing', () => {
    expect(MetricQualitySchema.safeParse('ST' + 'ale').success).toBe(false);
  });

  it('accepts null electrical readings when INA219 is unavailable', () => {
    expect(
      ElectricalMetricsSchema.safeParse({
        current: null,
        voltage: null,
        power: null,
        energy: metric(0, 'Wh'),
      }).success,
    ).toBe(true);
  });

  it('rejects negative packet counters', () => {
    expect(
      CommunicationMetricsSchema.safeParse({
        health: 'DEGRADED',
        lastHeartbeatAt: timestamp,
        packetsSent: -1,
        packetsReceived: 2,
        packetsLost: 1,
        packetLossPercent: 50,
        averageLatencyMs: 10,
      }).success,
    ).toBe(false);
  });

  it('rejects an invalid ISO timestamp', () => {
    expect(
      TelemetrySampleSchema.safeParse({
        id: 'sample-1',
        schemaVersion: 1,
        timestamp: 'not-a-timestamp',
        entity: { entityType: 'NODE', entityId: 'node-1' },
        metric: 'UPTIME',
        value: 1000,
        unit: 'MS',
        source: 'SIMULATED',
        quality: 'GOOD',
      }).success,
    ).toBe(false);
  });

  it('accepts a canonical telemetry sample', () => {
    expect(
      TelemetrySampleSchema.safeParse({
        id: 'sample-1',
        schemaVersion: 1,
        timestamp,
        entity: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
        metric: 'SENSOR_ACTIVE',
        value: true,
        unit: 'BOOLEAN',
        source: 'SIMULATED',
        quality: 'GOOD',
      }).success,
    ).toBe(true);
  });
});
