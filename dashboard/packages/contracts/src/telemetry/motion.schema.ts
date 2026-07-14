import { z } from 'zod';
import { NodeIdSchema, NonEmptyIdSchema, SensorIdSchema } from '../common/identifiers.schema.js';
import { ConfidenceSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { DirectionSchema } from '../enums/system.enums.js';
import { DataSourceSchema } from '../enums/telemetry.enums.js';

export const MotionEventSchema = z
  .object({
    id: NonEmptyIdSchema,
    timestamp: UtcTimestampSchema,
    nodeId: NodeIdSchema,
    sensorId: SensorIdSchema,
    active: z.boolean(),
    direction: DirectionSchema,
    confidence: ConfidenceSchema,
    source: DataSourceSchema,
  })
  .strict();

export const DirectionStateSchema = z
  .object({
    direction: DirectionSchema,
    confidence: ConfidenceSchema,
    confirmedBySensorIds: z.array(SensorIdSchema),
    updatedAt: UtcTimestampSchema,
    source: DataSourceSchema,
  })
  .strict();

export type MotionEvent = z.infer<typeof MotionEventSchema>;
export type DirectionState = z.infer<typeof DirectionStateSchema>;
