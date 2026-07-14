import { z } from 'zod';
import { LampIdSchema } from '../common/identifiers.schema.js';
import { NonNegativeIntegerSchema, PercentageSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { LampHealthSchema, LampOperatingStateSchema } from '../enums/health.enums.js';
import { ElectricalMetricsSchema } from '../telemetry/electrical-metrics.schema.js';

export const LampSnapshotSchema = z
  .object({
    lampId: LampIdSchema,
    operatingState: LampOperatingStateSchema,
    health: LampHealthSchema,
    brightnessPercent: PercentageSchema,
    targetBrightnessPercent: PercentageSchema,
    pwmDutyPercent: PercentageSchema,
    electrical: ElectricalMetricsSchema,
    fadeRemainingMs: NonNegativeIntegerSchema,
    updatedAt: UtcTimestampSchema,
  })
  .strict();

export type LampSnapshot = z.infer<typeof LampSnapshotSchema>;
