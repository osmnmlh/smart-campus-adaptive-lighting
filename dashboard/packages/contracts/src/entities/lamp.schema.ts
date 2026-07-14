import { z } from 'zod';
import { LampIdSchema, NodeIdSchema, SensorIdSchema } from '../common/identifiers.schema.js';
import { NonNegativeIntegerSchema, NonNegativeNumberSchema } from '../common/metric.schema.js';

export const LampSchema = z
  .object({
    id: LampIdSchema,
    displayName: z.string().trim().min(1),
    nodeId: NodeIdSchema,
    sensorId: SensorIdSchema.nullable().optional(),
    pwmChannel: NonNegativeIntegerSchema,
    nominalPowerW: NonNegativeNumberSchema.positive(),
  })
  .strict();

export type Lamp = z.infer<typeof LampSchema>;
