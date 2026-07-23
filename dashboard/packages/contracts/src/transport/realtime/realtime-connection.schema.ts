import { z } from 'zod';
import { UtcTimestampSchema } from '../../common/timestamp.schema.js';
import { CommunicationNodeIdSchema } from '../communication-identifiers.js';

export const RealtimeDataModeSchema = z.enum(['SIMULATED', 'DISCONNECTED', 'DEGRADED', 'LIVE']);
export const RealtimeDataMode = RealtimeDataModeSchema.enum;

export const RealtimeGatewayConnectivitySchema = z.enum(['UNKNOWN', 'ONLINE', 'OFFLINE']);
export const RealtimeGatewayConnectivity = RealtimeGatewayConnectivitySchema.enum;

export const RealtimeConnectionStateV1Schema = z
  .object({
    dataMode: RealtimeDataModeSchema,
    mqttEnabled: z.boolean(),
    brokerConnected: z.boolean(),
    gatewayStatus: RealtimeGatewayConnectivitySchema,
    onlineNodeIds: z.array(CommunicationNodeIdSchema).max(3),
    changedAt: UtcTimestampSchema,
  })
  .strict()
  .superRefine((state, context) => {
    if (new Set(state.onlineNodeIds).size !== state.onlineNodeIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['onlineNodeIds'],
        message: 'onlineNodeIds must be unique',
      });
    }

    const allNodesOnline =
      state.onlineNodeIds.length === 3 &&
      (['NODE_1', 'NODE_2', 'NODE_3'] as const).every((nodeId) =>
        state.onlineNodeIds.includes(nodeId),
      );
    const expectedMode = !state.mqttEnabled
      ? 'SIMULATED'
      : !state.brokerConnected
        ? 'DISCONNECTED'
        : state.gatewayStatus === 'ONLINE' && allNodesOnline
          ? 'LIVE'
          : 'DEGRADED';
    if (state.dataMode !== expectedMode) {
      context.addIssue({
        code: 'custom',
        path: ['dataMode'],
        message: `dataMode must be ${expectedMode} for the supplied connection state`,
      });
    }
  });

export type RealtimeDataMode = z.infer<typeof RealtimeDataModeSchema>;
export type RealtimeGatewayConnectivity = z.infer<typeof RealtimeGatewayConnectivitySchema>;
export type RealtimeConnectionStateV1 = z.infer<typeof RealtimeConnectionStateV1Schema>;
