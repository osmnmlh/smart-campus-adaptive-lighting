import { z } from 'zod';
import { NodeIdSchema, SensorIdSchema } from '../common/identifiers.schema.js';
import { NonNegativeIntegerSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { NodeHealthSchema } from '../enums/health.enums.js';
import { CommunicationMetricsSchema } from '../telemetry/communication-metrics.schema.js';

export const NodeSnapshotSchema = z
  .object({
    nodeId: NodeIdSchema,
    health: NodeHealthSchema,
    online: z.boolean(),
    firmwareVersion: z.string().trim().min(1).optional(),
    uptimeMs: NonNegativeIntegerSchema,
    lastResetReason: z.string().trim().min(1).optional(),
    freeHeapBytes: NonNegativeIntegerSchema.optional(),
    communication: CommunicationMetricsSchema,
    lastMotionAt: UtcTimestampSchema.optional(),
    lastSensorTriggeredId: SensorIdSchema.optional(),
    holdRemainingMs: NonNegativeIntegerSchema,
  })
  .strict();

export type NodeSnapshot = z.infer<typeof NodeSnapshotSchema>;
