import { z } from 'zod';
import { LampIdSchema, NodeIdSchema, SensorIdSchema } from '../common/identifiers.schema.js';
import { SensorTypeSchema } from '../enums/telemetry.enums.js';

export const SensorSchema = z
  .object({
    id: SensorIdSchema,
    displayName: z.string().trim().min(1),
    nodeId: NodeIdSchema,
    lampId: LampIdSchema.nullable().optional(),
    type: SensorTypeSchema,
    optional: z.boolean(),
  })
  .strict();

export type Sensor = z.infer<typeof SensorSchema>;
