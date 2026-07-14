import { z } from 'zod';
import {
  NonNegativeIntegerSchema,
  NonNegativeNumberSchema,
  PercentageSchema,
} from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { CommunicationHealthSchema } from '../enums/health.enums.js';

export const CommunicationMetricsSchema = z
  .object({
    health: CommunicationHealthSchema,
    lastHeartbeatAt: UtcTimestampSchema.nullable(),
    packetsSent: NonNegativeIntegerSchema,
    packetsReceived: NonNegativeIntegerSchema,
    packetsLost: NonNegativeIntegerSchema,
    packetLossPercent: PercentageSchema,
    averageLatencyMs: NonNegativeNumberSchema.nullable(),
    rssiDbm: z.number().finite().optional(),
    lastSequenceNumber: NonNegativeIntegerSchema.optional(),
    lastMessageSent: z.string().trim().min(1).optional(),
    lastMessageReceived: z.string().trim().min(1).optional(),
  })
  .strict();

export type CommunicationMetrics = z.infer<typeof CommunicationMetricsSchema>;
