import { z } from 'zod';
import { SensorIdSchema } from '../common/identifiers.schema.js';
import { NumericMetricValueSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { SensorHealthSchema } from '../enums/health.enums.js';

export const SensorSnapshotSchema = z
  .object({
    sensorId: SensorIdSchema,
    health: SensorHealthSchema,
    active: z.boolean().optional(),
    reading: NumericMetricValueSchema.optional(),
    lastChangedAt: UtcTimestampSchema,
    errorCode: z.string().trim().min(1).optional(),
  })
  .strict();

export type SensorSnapshot = z.infer<typeof SensorSnapshotSchema>;
