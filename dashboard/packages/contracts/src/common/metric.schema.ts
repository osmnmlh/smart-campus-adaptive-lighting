import { z } from 'zod';
import {
  DataSourceSchema,
  MetricQualitySchema,
  MetricUnitSchema,
} from '../enums/telemetry.enums.js';
import { UtcTimestampSchema } from './timestamp.schema.js';

export const PercentageSchema = z.number().finite().min(0).max(100);
export const NonNegativeIntegerSchema = z.number().int().nonnegative();
export const PositiveIntegerSchema = z.number().int().positive();
export const NonNegativeNumberSchema = z.number().finite().nonnegative();
export const ConfidenceSchema = PercentageSchema;

export const createMetricValueSchema = <T extends z.ZodType>(valueSchema: T) =>
  z
    .object({
      value: valueSchema,
      unit: MetricUnitSchema,
      source: DataSourceSchema,
      observedAt: UtcTimestampSchema,
      quality: MetricQualitySchema,
    })
    .strict();

export const NumericMetricValueSchema = createMetricValueSchema(z.number().finite());
export const NonNegativeMetricValueSchema = createMetricValueSchema(NonNegativeNumberSchema);
export const BooleanMetricValueSchema = createMetricValueSchema(z.boolean());
export const PercentageMetricValueSchema = createMetricValueSchema(PercentageSchema).extend({
  unit: z.literal('PERCENT'),
});
export const LuxMetricValueSchema = createMetricValueSchema(NonNegativeNumberSchema).extend({
  unit: z.literal('LX'),
});

export type MetricValue<T> = {
  value: T;
  unit: z.infer<typeof MetricUnitSchema>;
  source: z.infer<typeof DataSourceSchema>;
  observedAt: z.infer<typeof UtcTimestampSchema>;
  quality: z.infer<typeof MetricQualitySchema>;
};
