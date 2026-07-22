import { z } from 'zod';
import { SchemaVersionSchema } from '../common/identifiers.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import {
  BootIdSchema,
  GatewayIdSchema,
  TransportSequenceSchema,
} from './communication-identifiers.js';
import { buildNodeMessageId } from './message-id.js';
import { NodeTransportEnvelopeV1Schema } from './node-transport-envelope.js';

export const GatewayMqttEnvelopeV1Schema = z
  .object({
    schemaVersion: SchemaVersionSchema,
    gatewayId: GatewayIdSchema,
    gatewayBootId: BootIdSchema,
    gatewaySequence: TransportSequenceSchema,
    receivedAt: UtcTimestampSchema,
    messageId: z.string(),
    nodeMessage: NodeTransportEnvelopeV1Schema,
  })
  .strict()
  .superRefine((envelope, context) => {
    const expected = buildNodeMessageId(envelope.nodeMessage);
    if (envelope.messageId !== expected) {
      context.addIssue({
        code: 'custom',
        path: ['messageId'],
        message: 'messageId does not match node origin identity',
      });
    }
  });

export interface GatewayEnrichmentV1 {
  gatewayId: 'GW_1';
  gatewayBootId: string;
  gatewaySequence: number;
  receivedAt: string;
}

export const enrichNodeMessageForGateway = (
  nodeMessageInput: unknown,
  metadataInput: GatewayEnrichmentV1,
): GatewayMqttEnvelopeV1 => {
  const nodeMessage = NodeTransportEnvelopeV1Schema.parse(nodeMessageInput);
  return GatewayMqttEnvelopeV1Schema.parse({
    schemaVersion: 1,
    ...metadataInput,
    messageId: buildNodeMessageId(nodeMessage),
    nodeMessage,
  });
};

export type GatewayMqttEnvelopeV1 = z.infer<typeof GatewayMqttEnvelopeV1Schema>;
