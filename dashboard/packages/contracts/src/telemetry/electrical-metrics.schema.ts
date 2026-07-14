import { z } from 'zod';
import { createMetricValueSchema, NonNegativeNumberSchema } from '../common/metric.schema.js';

export const CurrentMetricValueSchema = createMetricValueSchema(NonNegativeNumberSchema).extend({
  unit: z.literal('A'),
});
export const VoltageMetricValueSchema = createMetricValueSchema(NonNegativeNumberSchema).extend({
  unit: z.literal('V'),
});
export const PowerMetricValueSchema = createMetricValueSchema(NonNegativeNumberSchema).extend({
  unit: z.literal('W'),
});
export const EnergyMetricValueSchema = createMetricValueSchema(NonNegativeNumberSchema).extend({
  unit: z.literal('Wh'),
});

export const ElectricalMetricsSchema = z
  .object({
    current: CurrentMetricValueSchema.nullable(),
    voltage: VoltageMetricValueSchema.nullable(),
    power: PowerMetricValueSchema.nullable(),
    energy: EnergyMetricValueSchema,
  })
  .strict();

export type CurrentMetricValue = z.infer<typeof CurrentMetricValueSchema>;
export type VoltageMetricValue = z.infer<typeof VoltageMetricValueSchema>;
export type PowerMetricValue = z.infer<typeof PowerMetricValueSchema>;
export type EnergyMetricValue = z.infer<typeof EnergyMetricValueSchema>;
export type ElectricalMetrics = z.infer<typeof ElectricalMetricsSchema>;
