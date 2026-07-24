import { describe, expect, it } from 'vitest';

import {
  DataSource,
  EnergyAnalyticsSummarySchema,
  EnergyLampBreakdownSchema,
  MetricQuality,
} from '../src/index.js';

const timestamp = '2026-07-24T08:00:00.000Z';
const lamps = Array.from({ length: 5 }, (_, index) => ({
  lampId: `lamp-${index + 1}`,
  brightnessPercent: index === 2 ? 60 : 30,
  currentPowerW: index === 2 ? 6 : 3,
  dataSource: index === 2 ? DataSource.MEASURED : DataSource.ESTIMATED,
  measurementFresh: index === 2,
  ...(index === 2 ? { measuredAt: timestamp } : {}),
}));

const validSummary = {
  calculatedAt: timestamp,
  sessionStartedAt: timestamp,
  sessionDurationSeconds: 0,
  nominalLampPowerW: 10,
  measuredLampCount: 1,
  estimatedLampCount: 4,
  simulatedLampCount: 0,
  totalLampCount: 5,
  measurementCoveragePercent: 20,
  currentActualPowerW: 18,
  currentReferencePowerW: 50,
  currentSavedPowerW: 32,
  currentSavingsPercent: 64,
  actualSessionEnergyWh: 0,
  referenceSessionEnergyWh: 0,
  savedSessionEnergyWh: 0,
  sessionSavingsPercent: 0,
  lamps,
  dataSource: DataSource.CALCULATED,
  referenceDataSource: DataSource.NOMINAL,
  savingsDataSource: DataSource.CALCULATED,
  quality: MetricQuality.GOOD,
  limitationCode: null,
  persistenceMode: 'SESSION_ONLY',
} as const;

describe('energy analytics contracts', () => {
  it('exports and parses a valid summary from the package root', () => {
    expect(EnergyAnalyticsSummarySchema.parse(validSummary)).toEqual(validSummary);
  });

  it('rejects negative power', () => {
    expect(
      EnergyAnalyticsSummarySchema.safeParse({
        ...validSummary,
        currentActualPowerW: -1,
      }).success,
    ).toBe(false);
  });

  it('rejects coverage that does not match the measured lamp count', () => {
    expect(
      EnergyAnalyticsSummarySchema.safeParse({
        ...validSummary,
        measurementCoveragePercent: 80,
      }).success,
    ).toBe(false);
  });

  it('rejects an inconsistent total lamp count', () => {
    expect(
      EnergyAnalyticsSummarySchema.safeParse({
        ...validSummary,
        totalLampCount: 4,
      }).success,
    ).toBe(false);
  });

  it('rejects a calculated lamp input source', () => {
    expect(
      EnergyLampBreakdownSchema.safeParse({
        ...lamps[0],
        dataSource: DataSource.CALCULATED,
      }).success,
    ).toBe(false);
  });

  it('requires measured lamp values to be fresh and timestamped', () => {
    expect(
      EnergyLampBreakdownSchema.safeParse({
        ...lamps[2],
        measurementFresh: false,
      }).success,
    ).toBe(false);
  });

  it('prevents simulated values from claiming a physical measurement', () => {
    expect(
      EnergyLampBreakdownSchema.safeParse({
        ...lamps[0],
        dataSource: DataSource.SIMULATED,
        measurementFresh: true,
        measuredAt: timestamp,
      }).success,
    ).toBe(false);
  });

  it('accepts the explicit integration-gap limitation', () => {
    const parsed = EnergyAnalyticsSummarySchema.parse({
      ...validSummary,
      quality: MetricQuality.STALE,
      limitationCode: 'INTEGRATION_GAP_CAPPED',
    });
    expect(parsed.limitationCode).toBe('INTEGRATION_GAP_CAPPED');
  });

  it('rejects persistence modes other than SESSION_ONLY', () => {
    expect(
      EnergyAnalyticsSummarySchema.safeParse({
        ...validSummary,
        persistenceMode: 'DATABASE',
      }).success,
    ).toBe(false);
  });
});
