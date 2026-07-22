import { z } from 'zod';
import { SchemaVersionSchema } from '../common/identifiers.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import {
  BootIdSchema,
  CommunicationChannelSchema,
  GatewayIdSchema,
  UptimeMsSchema,
} from './communication-identifiers.js';

export const GatewayStatusMessageV1Schema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    gatewayId: GatewayIdSchema,
    gatewayBootId: BootIdSchema,
    status: z.enum(['ONLINE', 'OFFLINE']),
    uptimeMs: UptimeMsSchema,
    communicationChannel: CommunicationChannelSchema,
    firmwareVersion: z.string().trim().min(1).max(64),
    publishedAt: UtcTimestampSchema,
    transportSource: z.literal('GATEWAY'),
  })
  .strict();

export type GatewayStatusMessageV1 = z.infer<typeof GatewayStatusMessageV1Schema>;
