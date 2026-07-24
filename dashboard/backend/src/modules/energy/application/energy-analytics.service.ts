import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DataSource,
  EnergyAnalyticsSummarySchema,
  MetricQuality,
  type EnergyAnalyticsSummary,
  type UtcTimestamp,
} from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../../common/config/environment.js';
import {
  SNAPSHOT_READ_REPOSITORY,
  type SnapshotReadRepository,
} from '../../read-model/domain/read-repositories.js';
import {
  REALTIME_CLOCK,
  REALTIME_PUBLISHER,
  type RealtimeClock,
  type RealtimePublisherPort,
} from '../../../realtime/domain/realtime-ports.js';
import {
  calculateEnergyPower,
  normalizeEnergyValue,
  type EnergyPowerCalculation,
} from '../domain/energy-calculator.js';
import { ENERGY_CONFIG } from '../domain/energy-ports.js';

function millisecondsBetween(later: UtcTimestamp, earlier: UtcTimestamp): number {
  return Math.max(0, Date.parse(later) - Date.parse(earlier));
}

function eventSignature(summary: EnergyAnalyticsSummary): string {
  return JSON.stringify({
    measuredLampCount: summary.measuredLampCount,
    estimatedLampCount: summary.estimatedLampCount,
    measurementCoveragePercent: summary.measurementCoveragePercent,
    currentActualPowerW: summary.currentActualPowerW,
    currentReferencePowerW: summary.currentReferencePowerW,
    currentSavedPowerW: summary.currentSavedPowerW,
    currentSavingsPercent: summary.currentSavingsPercent,
    lamps: summary.lamps,
    limitationCode: summary.limitationCode,
  });
}

@Injectable()
export class EnergyAnalyticsService {
  private readonly logger = new Logger(EnergyAnalyticsService.name);
  private readonly sessionStartedAt: UtcTimestamp;
  private lastCalculatedAt: UtcTimestamp;
  private previousPower: EnergyPowerCalculation;
  private actualSessionEnergyWh = 0;
  private referenceSessionEnergyWh = 0;
  private savedSessionEnergyWh = 0;
  private integrationGapCapped = false;
  private lastPublishedSignature: string | null = null;

  constructor(
    @Inject(SNAPSHOT_READ_REPOSITORY) private readonly snapshots: SnapshotReadRepository,
    @Inject(REALTIME_CLOCK) private readonly clock: RealtimeClock,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisherPort,
    @Inject(ENERGY_CONFIG) private readonly config: EnvironmentConfig,
  ) {
    this.sessionStartedAt = this.clock.now();
    this.lastCalculatedAt = this.sessionStartedAt;
    this.previousPower = this.calculatePower(this.sessionStartedAt);
  }

  getSummary(): EnergyAnalyticsSummary {
    const calculatedAt = this.clock.now();
    const elapsedMs = millisecondsBetween(calculatedAt, this.lastCalculatedAt);
    const integratedMs = Math.min(elapsedMs, this.config.energyMaxIntegrationGapMs);
    if (elapsedMs > this.config.energyMaxIntegrationGapMs) this.integrationGapCapped = true;

    const elapsedHours = integratedMs / 3_600_000;
    this.actualSessionEnergyWh += this.previousPower.currentActualPowerW * elapsedHours;
    this.referenceSessionEnergyWh += this.previousPower.currentReferencePowerW * elapsedHours;
    this.savedSessionEnergyWh += this.previousPower.currentSavedPowerW * elapsedHours;

    const currentPower = this.calculatePower(calculatedAt);
    this.lastCalculatedAt = calculatedAt;
    this.previousPower = currentPower;

    const referenceSessionEnergyWh = normalizeEnergyValue(this.referenceSessionEnergyWh);
    const savedSessionEnergyWh = normalizeEnergyValue(this.savedSessionEnergyWh);
    return EnergyAnalyticsSummarySchema.parse({
      calculatedAt,
      sessionStartedAt: this.sessionStartedAt,
      sessionDurationSeconds: normalizeEnergyValue(
        millisecondsBetween(calculatedAt, this.sessionStartedAt) / 1_000,
      ),
      nominalLampPowerW: this.config.energyNominalLampPowerW,
      measuredLampCount: currentPower.measuredLampCount,
      estimatedLampCount: currentPower.estimatedLampCount,
      simulatedLampCount: 0,
      totalLampCount: currentPower.lamps.length,
      measurementCoveragePercent: currentPower.measurementCoveragePercent,
      currentActualPowerW: currentPower.currentActualPowerW,
      currentReferencePowerW: currentPower.currentReferencePowerW,
      currentSavedPowerW: currentPower.currentSavedPowerW,
      currentSavingsPercent: currentPower.currentSavingsPercent,
      actualSessionEnergyWh: normalizeEnergyValue(this.actualSessionEnergyWh),
      referenceSessionEnergyWh,
      savedSessionEnergyWh,
      sessionSavingsPercent:
        referenceSessionEnergyWh > 0
          ? normalizeEnergyValue((savedSessionEnergyWh / referenceSessionEnergyWh) * 100)
          : 0,
      lamps: currentPower.lamps,
      dataSource: DataSource.CALCULATED,
      referenceDataSource: DataSource.NOMINAL,
      savingsDataSource: DataSource.CALCULATED,
      quality: this.integrationGapCapped ? MetricQuality.STALE : MetricQuality.GOOD,
      limitationCode: this.integrationGapCapped ? 'INTEGRATION_GAP_CAPPED' : null,
      persistenceMode: 'SESSION_ONLY',
    });
  }

  refreshAndPublish(): EnergyAnalyticsSummary {
    const summary = this.getSummary();
    const signature = eventSignature(summary);
    if (signature === this.lastPublishedSignature) return summary;
    this.lastPublishedSignature = signature;
    try {
      this.publisher.publish({ eventType: 'ENERGY_ANALYTICS_UPDATED', payload: summary });
    } catch {
      this.logger.warn('Realtime energy analytics publication failed');
    }
    return summary;
  }

  private calculatePower(calculatedAt: UtcTimestamp): EnergyPowerCalculation {
    return calculateEnergyPower({
      lamps: this.snapshots.getCurrentSnapshot().lamps,
      calculatedAt,
      nominalLampPowerW: this.config.energyNominalLampPowerW,
      measurementStaleMs: this.config.energyMeasurementStaleMs,
    });
  }
}
