import {
  DataSource,
  MetricQuality,
  type LampSnapshot,
  type RealtimeDomainEventV1,
  type SystemSnapshot,
  type UtcTimestamp,
} from '@smart-campus/contracts';
import { vi } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';
import { EnergyAnalyticsService } from '../../src/modules/energy/application/energy-analytics.service.js';
import type { SnapshotReadRepository } from '../../src/modules/read-model/domain/read-repositories.js';
import type {
  RealtimeClock,
  RealtimePublisherPort,
} from '../../src/realtime/domain/realtime-ports.js';

class MutableClock implements RealtimeClock {
  constructor(public current: UtcTimestamp) {}
  now(): UtcTimestamp {
    return this.current;
  }
}

function lamp(lampNumber: number, brightnessPercent: number): LampSnapshot {
  return {
    lampId: `lamp-${lampNumber}`,
    operatingState: 'ACTIVE',
    health: 'HEALTHY',
    brightnessPercent,
    targetBrightnessPercent: brightnessPercent,
    pwmDutyPercent: brightnessPercent,
    electrical: {
      current: null,
      voltage: null,
      power: null,
      energy: {
        value: 0,
        unit: 'Wh',
        source: DataSource.ESTIMATED,
        observedAt: '2026-07-24T08:00:00.000Z',
        quality: MetricQuality.GOOD,
      },
    },
    fadeRemainingMs: 0,
    updatedAt: '2026-07-24T08:00:00.000Z',
  };
}

function createHarness(start = '2026-07-24T08:00:00.000Z' as UtcTimestamp) {
  const clock = new MutableClock(start);
  const lamps = [1, 2, 3, 4, 5].map((lampNumber) => lamp(lampNumber, 100));
  const repository: SnapshotReadRepository = {
    getCurrentSnapshot: () => ({ lamps }) as SystemSnapshot,
  };
  const publish = vi.fn(() => ({}) as RealtimeDomainEventV1);
  const publisher = {
    publish,
    getStreamId: vi.fn(),
    getCurrentCursor: vi.fn(),
    replayAfter: vi.fn(),
    subscribe: vi.fn(),
  } as unknown as RealtimePublisherPort;
  const service = new EnergyAnalyticsService(
    repository,
    clock,
    publisher,
    loadEnvironment({
      ENERGY_NOMINAL_LAMP_POWER_W: '10',
      ENERGY_MEASUREMENT_STALE_MS: '15000',
      ENERGY_MAX_INTEGRATION_GAP_MS: '30000',
    }),
  );
  return { service, clock, lamps, publish };
}

describe('EnergyAnalyticsService', () => {
  it('starts a new in-memory session for each service instance', () => {
    const first = createHarness('2026-07-24T08:00:00.000Z');
    const second = createHarness('2026-07-24T09:00:00.000Z');
    expect(first.service.getSummary().sessionStartedAt).toBe('2026-07-24T08:00:00.000Z');
    expect(second.service.getSummary().sessionStartedAt).toBe('2026-07-24T09:00:00.000Z');
  });

  it('integrates the previous power as a step function', () => {
    const { service, clock } = createHarness();
    clock.current = '2026-07-24T08:00:10.000Z';
    const summary = service.getSummary();
    expect(summary.actualSessionEnergyWh).toBe(0.139);
    expect(summary.referenceSessionEnergyWh).toBe(0.139);
    expect(summary.savedSessionEnergyWh).toBe(0);
  });

  it('caps a long integration gap and discloses the limitation', () => {
    const { service, clock } = createHarness();
    clock.current = '2026-07-24T08:01:00.000Z';
    const summary = service.getSummary();
    expect(summary.actualSessionEnergyWh).toBe(0.417);
    expect(summary.quality).toBe(MetricQuality.STALE);
    expect(summary.limitationCode).toBe('INTEGRATION_GAP_CAPPED');
    expect(summary.sessionDurationSeconds).toBe(60);
  });

  it('requires no timer and advances only when summary is requested', () => {
    const { service, clock, publish } = createHarness();
    clock.current = '2026-07-24T08:00:05.000Z';
    expect(publish).not.toHaveBeenCalled();
    expect(service.getSummary().sessionDurationSeconds).toBe(5);
  });

  it('does not publish from a read-only summary request', () => {
    const { service, publish } = createHarness();
    service.getSummary();
    expect(publish).not.toHaveBeenCalled();
  });

  it('suppresses a second realtime event for unchanged current values', () => {
    const { service, publish } = createHarness();
    service.refreshAndPublish();
    service.refreshAndPublish();
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('publishes a recalculation after a lamp brightness update', () => {
    const { service, lamps, publish } = createHarness();
    service.refreshAndPublish();
    lamps[0] = lamp(1, 30);
    const summary = service.refreshAndPublish();
    expect(summary.currentActualPowerW).toBe(43);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it('publishes fresh L3 electrical provenance without using device energyWh', () => {
    const { service, lamps, publish } = createHarness();
    service.refreshAndPublish();
    lamps[2] = {
      ...lamp(3, 60),
      electrical: {
        current: null,
        voltage: null,
        power: {
          value: 7,
          unit: 'W',
          source: DataSource.MEASURED,
          observedAt: '2026-07-24T08:00:00.000Z',
          quality: MetricQuality.GOOD,
        },
        energy: {
          value: 999,
          unit: 'Wh',
          source: DataSource.MEASURED,
          observedAt: '2026-07-24T08:00:00.000Z',
          quality: MetricQuality.GOOD,
        },
      },
    };
    const summary = service.refreshAndPublish();
    expect(summary.lamps[2]).toMatchObject({
      currentPowerW: 7,
      dataSource: DataSource.MEASURED,
    });
    expect(summary.actualSessionEnergyWh).toBe(0);
    expect(publish).toHaveBeenCalledTimes(2);
  });

  it('keeps the summary when realtime publication fails', () => {
    const { service, publish } = createHarness();
    publish.mockImplementation(() => {
      throw new Error('publisher unavailable');
    });
    expect(service.refreshAndPublish().totalLampCount).toBe(5);
  });
});
