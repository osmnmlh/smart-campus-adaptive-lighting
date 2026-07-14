import { z } from 'zod';
import {
  EntityRefSchema,
  NonEmptyIdSchema,
  ScenarioIdSchema,
  SchemaVersionSchema,
} from '../common/identifiers.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import {
  DataSourceSchema,
  MetricQualitySchema,
  MetricUnitSchema,
  TelemetryMetricSchema,
} from '../enums/telemetry.enums.js';

export const TelemetrySampleSchema = z
  .object({
    id: NonEmptyIdSchema,
    schemaVersion: SchemaVersionSchema,
    scenarioRunId: ScenarioIdSchema.optional(),
    timestamp: UtcTimestampSchema,
    entity: EntityRefSchema,
    metric: TelemetryMetricSchema,
    value: z.union([z.number().finite(), z.boolean(), z.string()]),
    unit: MetricUnitSchema,
    source: DataSourceSchema,
    quality: MetricQualitySchema,
  })
  .strict();

export type TelemetrySample = z.infer<typeof TelemetrySampleSchema>;
