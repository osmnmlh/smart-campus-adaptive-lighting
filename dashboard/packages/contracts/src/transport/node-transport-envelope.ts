import { z } from 'zod';
import { SchemaVersionSchema } from '../common/identifiers.schema.js';
import {
  BootIdSchema,
  CommunicationNodeIdSchema,
  TransportSequenceSchema,
  UptimeMsSchema,
} from './communication-identifiers.js';
import {
  ElectricalMeasurementPayloadV1Schema,
  LampStatePayloadV1Schema,
  NodeHeartbeatPayloadV1Schema,
  SensorEventPayloadV1Schema,
} from './node-message-payloads.js';

const baseShape = {
  schemaVersion: SchemaVersionSchema,
  nodeId: CommunicationNodeIdSchema,
  bootId: BootIdSchema,
  sequence: TransportSequenceSchema,
  uptimeMs: UptimeMsSchema,
};

const rawNodeTransportEnvelopeV1Schema = z.discriminatedUnion('messageType', [
  z
    .object({
      ...baseShape,
      messageType: z.literal('HEARTBEAT'),
      payload: NodeHeartbeatPayloadV1Schema,
    })
    .strict(),
  z
    .object({
      ...baseShape,
      messageType: z.literal('SENSOR_EVENT'),
      payload: SensorEventPayloadV1Schema,
    })
    .strict(),
  z
    .object({
      ...baseShape,
      messageType: z.literal('LAMP_STATE'),
      payload: LampStatePayloadV1Schema,
    })
    .strict(),
  z
    .object({
      ...baseShape,
      messageType: z.literal('ELECTRICAL_MEASUREMENT'),
      payload: ElectricalMeasurementPayloadV1Schema,
    })
    .strict(),
]);

const sensorOwners = {
  NODE_1: ['IR1', 'IR2'],
  NODE_2: ['IR3'],
  NODE_3: ['IR4', 'IR5'],
} as const;
const lampOwners = {
  NODE_1: ['L1', 'L2'],
  NODE_2: ['L3'],
  NODE_3: ['L4', 'L5'],
} as const;

export const NodeTransportEnvelopeV1Schema = rawNodeTransportEnvelopeV1Schema.superRefine(
  (message, context) => {
    if (
      message.messageType === 'SENSOR_EVENT' &&
      !(sensorOwners[message.nodeId] as readonly string[]).includes(message.payload.sensorId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['payload', 'sensorId'],
        message: 'Sensor is not owned by the source node',
      });
    }
    if (
      message.messageType === 'LAMP_STATE' &&
      !(lampOwners[message.nodeId] as readonly string[]).includes(message.payload.lampId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['payload', 'lampId'],
        message: 'Lamp is not owned by the source node',
      });
    }
    if (message.messageType === 'ELECTRICAL_MEASUREMENT' && message.nodeId !== 'NODE_2') {
      context.addIssue({
        code: 'custom',
        path: ['nodeId'],
        message: 'Measured electrical transport is limited to NODE_2/L3/INA219_1',
      });
    }
  },
);

export type NodeTransportEnvelopeV1 = z.infer<typeof NodeTransportEnvelopeV1Schema>;
