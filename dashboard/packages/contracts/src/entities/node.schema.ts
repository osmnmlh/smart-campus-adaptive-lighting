import { z } from 'zod';
import { LampIdSchema, NodeIdSchema, SensorIdSchema } from '../common/identifiers.schema.js';
import { NonNegativeIntegerSchema } from '../common/metric.schema.js';

export const NodeSchema = z
  .object({
    id: NodeIdSchema,
    displayName: z.string().trim().min(1),
    topologyOrder: NonNegativeIntegerSchema,
    controlledLampIds: z.array(LampIdSchema),
    sensorIds: z.array(SensorIdSchema),
  })
  .strict();

export type Node = z.infer<typeof NodeSchema>;
