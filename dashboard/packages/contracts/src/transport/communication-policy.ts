import { z } from 'zod';
import { NodeMessageTypeSchema, type NodeMessageType } from './node-message-payloads.js';

export const CommunicationPolicyV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    heartbeatIntervalMs: z.number().int().positive(),
    offlineTimeoutMs: z.number().int().positive(),
    missedHeartbeatThreshold: z.number().int().positive(),
    mqttQos: z.literal(1),
    maxRetries: z
      .object({
        HEARTBEAT: z.literal(1),
        SENSOR_EVENT: z.literal(2),
        LAMP_STATE: z.literal(2),
        ELECTRICAL_MEASUREMENT: z.literal(1),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, context) => {
    if (policy.offlineTimeoutMs < policy.heartbeatIntervalMs * policy.missedHeartbeatThreshold) {
      context.addIssue({
        code: 'custom',
        path: ['offlineTimeoutMs'],
        message: 'Offline timeout must cover the missed-heartbeat threshold',
      });
    }
  });

export const COMMUNICATION_POLICY_V1 = CommunicationPolicyV1Schema.parse({
  schemaVersion: 1,
  heartbeatIntervalMs: 5_000,
  offlineTimeoutMs: 15_000,
  missedHeartbeatThreshold: 3,
  mqttQos: 1,
  maxRetries: { HEARTBEAT: 1, SENSOR_EVENT: 2, LAMP_STATE: 2, ELECTRICAL_MEASUREMENT: 1 },
});

export const MQTT_RETAIN_POLICY = {
  gatewayStatus: true,
  gatewayLastWill: true,
  nodeHeartbeat: false,
  nodeEvents: false,
  nodeTelemetry: false,
  nodeStatus: false,
} as const;

export const getMaxEspNowRetries = (messageType: unknown): number =>
  COMMUNICATION_POLICY_V1.maxRetries[NodeMessageTypeSchema.parse(messageType) as NodeMessageType];
