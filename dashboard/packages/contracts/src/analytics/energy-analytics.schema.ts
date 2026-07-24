import { z } from 'zod';

import { LampIdSchema } from '../common/identifiers.schema.js';
import {
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PercentageSchema,
} from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { DataSourceSchema, MetricQualitySchema } from '../enums/telemetry.enums.js';

export const EnergyLampDataSourceSchema = DataSourceSchema.extract([
  'MEASURED',
  'ESTIMATED',
  'SIMULATED',
]);

export const EnergyLampBreakdownSchema = z
  .object({
    lampId: LampIdSchema,
    brightnessPercent: PercentageSchema,
    currentPowerW: NonNegativeNumberSchema,
    dataSource: EnergyLampDataSourceSchema,
    measurementFresh: z.boolean(),
    measuredAt: UtcTimestampSchema.optional(),
  })
  .strict()
  .superRefine((lamp, context) => {
    if (
      lamp.dataSource === 'MEASURED' &&
      (!lamp.measurementFresh || lamp.measuredAt === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['measurementFresh'],
        message: 'MEASURED lamp power must identify a fresh measurement',
      });
    }
    if (
      lamp.dataSource === 'SIMULATED' &&
      (lamp.measurementFresh || lamp.measuredAt !== undefined)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['measurementFresh'],
        message: 'SIMULATED lamp power cannot claim a physical measurement',
      });
    }
  });

export const EnergyAnalyticsLimitationCodeSchema = z.enum(['INTEGRATION_GAP_CAPPED']);

export const EnergyAnalyticsSummarySchema = z
  .object({
    calculatedAt: UtcTimestampSchema,
    sessionStartedAt: UtcTimestampSchema,
    sessionDurationSeconds: NonNegativeNumberSchema,
    nominalLampPowerW: NonNegativeNumberSchema.positive(),
    measuredLampCount: NonNegativeIntegerSchema,
    estimatedLampCount: NonNegativeIntegerSchema,
    simulatedLampCount: NonNegativeIntegerSchema,
    totalLampCount: NonNegativeIntegerSchema.positive(),
    measurementCoveragePercent: PercentageSchema,
    currentActualPowerW: NonNegativeNumberSchema,
    currentReferencePowerW: NonNegativeNumberSchema,
    currentSavedPowerW: NonNegativeNumberSchema,
    currentSavingsPercent: PercentageSchema,
    actualSessionEnergyWh: NonNegativeNumberSchema,
    referenceSessionEnergyWh: NonNegativeNumberSchema,
    savedSessionEnergyWh: NonNegativeNumberSchema,
    sessionSavingsPercent: PercentageSchema,
    lamps: z.array(EnergyLampBreakdownSchema).min(1),
    dataSource: z.literal('CALCULATED'),
    referenceDataSource: z.literal('NOMINAL'),
    savingsDataSource: z.literal('CALCULATED'),
    quality: MetricQualitySchema,
    limitationCode: EnergyAnalyticsLimitationCodeSchema.nullable(),
    persistenceMode: z.literal('SESSION_ONLY'),
  })
  .strict()
  .superRefine((summary, context) => {
    if (summary.totalLampCount !== summary.lamps.length) {
      context.addIssue({
        code: 'custom',
        path: ['totalLampCount'],
        message: 'totalLampCount must match the lamp breakdown length',
      });
    }
    if (
      summary.measuredLampCount + summary.estimatedLampCount + summary.simulatedLampCount !==
      summary.totalLampCount
    ) {
      context.addIssue({
        code: 'custom',
        path: ['measuredLampCount'],
        message: 'lamp provenance counts must add up to totalLampCount',
      });
    }
    const measuredLampCount = summary.lamps.filter((lamp) => lamp.dataSource === 'MEASURED').length;
    const estimatedLampCount = summary.lamps.filter(
      (lamp) => lamp.dataSource === 'ESTIMATED',
    ).length;
    const simulatedLampCount = summary.lamps.filter(
      (lamp) => lamp.dataSource === 'SIMULATED',
    ).length;
    if (
      measuredLampCount !== summary.measuredLampCount ||
      estimatedLampCount !== summary.estimatedLampCount ||
      simulatedLampCount !== summary.simulatedLampCount
    ) {
      context.addIssue({
        code: 'custom',
        path: ['lamps'],
        message: 'lamp provenance counts must match the lamp breakdown',
      });
    }
    const expectedCoverage = (measuredLampCount / summary.totalLampCount) * 100;
    if (Math.abs(expectedCoverage - summary.measurementCoveragePercent) > 0.001) {
      context.addIssue({
        code: 'custom',
        path: ['measurementCoveragePercent'],
        message: 'measurement coverage must match measuredLampCount / totalLampCount',
      });
    }
    if (new Set(summary.lamps.map((lamp) => lamp.lampId)).size !== summary.lamps.length) {
      context.addIssue({
        code: 'custom',
        path: ['lamps'],
        message: 'lamp breakdown identifiers must be unique',
      });
    }
  });

export type EnergyLampDataSource = z.infer<typeof EnergyLampDataSourceSchema>;
export type EnergyLampBreakdown = z.infer<typeof EnergyLampBreakdownSchema>;
export type EnergyAnalyticsLimitationCode = z.infer<typeof EnergyAnalyticsLimitationCodeSchema>;
export type EnergyAnalyticsSummary = z.infer<typeof EnergyAnalyticsSummarySchema>;
