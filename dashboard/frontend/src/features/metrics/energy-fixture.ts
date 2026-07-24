import {
  DataSource,
  EnergyAnalyticsSummarySchema,
  MetricQuality,
  type EnergyAnalyticsSummary,
} from '@smart-campus/contracts';

import { overviewSnapshot } from '@/features/overview/overview-fixture';

const nominalLampPowerW = 10;
const sessionStartedAt = '2026-06-15T19:30:00.000Z';

const lamps = overviewSnapshot.lamps.map((lamp) => ({
  lampId: lamp.lampId,
  brightnessPercent: lamp.brightnessPercent,
  currentPowerW: nominalLampPowerW * (lamp.brightnessPercent / 100),
  dataSource: DataSource.SIMULATED,
  measurementFresh: false,
}));
const currentActualPowerW = lamps.reduce((total, lamp) => total + lamp.currentPowerW, 0);
const currentReferencePowerW = nominalLampPowerW * lamps.length;
const currentSavedPowerW = Math.max(0, currentReferencePowerW - currentActualPowerW);

export const simulatedEnergySummary: EnergyAnalyticsSummary = EnergyAnalyticsSummarySchema.parse({
  calculatedAt: overviewSnapshot.snapshotAt,
  sessionStartedAt,
  sessionDurationSeconds: 3_600,
  nominalLampPowerW,
  measuredLampCount: 0,
  estimatedLampCount: 0,
  simulatedLampCount: lamps.length,
  totalLampCount: lamps.length,
  measurementCoveragePercent: 0,
  currentActualPowerW,
  currentReferencePowerW,
  currentSavedPowerW,
  currentSavingsPercent: (currentSavedPowerW / currentReferencePowerW) * 100,
  actualSessionEnergyWh: currentActualPowerW,
  referenceSessionEnergyWh: currentReferencePowerW,
  savedSessionEnergyWh: currentSavedPowerW,
  sessionSavingsPercent: (currentSavedPowerW / currentReferencePowerW) * 100,
  lamps,
  dataSource: DataSource.CALCULATED,
  referenceDataSource: DataSource.NOMINAL,
  savingsDataSource: DataSource.CALCULATED,
  quality: MetricQuality.GOOD,
  limitationCode: null,
  persistenceMode: 'SESSION_ONLY',
});
