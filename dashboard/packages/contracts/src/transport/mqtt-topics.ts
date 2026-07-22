import { z } from 'zod';
import {
  CommunicationNodeIdSchema,
  GatewayIdSchema,
  type CommunicationNodeId,
  type GatewayId,
} from './communication-identifiers.js';
import { NodeMessageTypeSchema, type NodeMessageType } from './node-message-payloads.js';

export const MQTT_TOPIC_PREFIX = 'smart-campus/v1' as const;
export const NodeTopicKindSchema = z.enum(['heartbeat', 'events', 'telemetry', 'status']);
export type NodeTopicKind = z.infer<typeof NodeTopicKindSchema>;

const topicKindByMessageType: Readonly<Record<NodeMessageType, NodeTopicKind>> = {
  HEARTBEAT: 'heartbeat',
  SENSOR_EVENT: 'events',
  LAMP_STATE: 'events',
  ELECTRICAL_MEASUREMENT: 'telemetry',
};

export const mapMessageTypeToTopicKind = (messageType: unknown): NodeTopicKind =>
  topicKindByMessageType[NodeMessageTypeSchema.parse(messageType)];

export const buildNodeMqttTopic = (nodeId: CommunicationNodeId, kind: NodeTopicKind): string =>
  `${MQTT_TOPIC_PREFIX}/nodes/${CommunicationNodeIdSchema.parse(nodeId)}/${NodeTopicKindSchema.parse(kind)}`;

export const parseNodeMqttTopic = (
  topic: unknown,
): { nodeId: CommunicationNodeId; kind: NodeTopicKind } => {
  if (typeof topic !== 'string' || topic.includes('+') || topic.includes('#'))
    throw new Error('Invalid node MQTT topic');
  const segments = topic.split('/');
  if (
    segments.length !== 5 ||
    segments[0] !== 'smart-campus' ||
    segments[1] !== 'v1' ||
    segments[2] !== 'nodes'
  ) {
    throw new Error('Invalid node MQTT topic');
  }
  return {
    nodeId: CommunicationNodeIdSchema.parse(segments[3]),
    kind: NodeTopicKindSchema.parse(segments[4]),
  };
};

export const buildGatewayStatusTopic = (gatewayId: GatewayId): string =>
  `${MQTT_TOPIC_PREFIX}/gateways/${GatewayIdSchema.parse(gatewayId)}/status`;

export const parseGatewayStatusTopic = (topic: unknown): { gatewayId: GatewayId } => {
  if (typeof topic !== 'string' || topic.includes('+') || topic.includes('#'))
    throw new Error('Invalid gateway MQTT topic');
  const segments = topic.split('/');
  if (
    segments.length !== 5 ||
    segments[0] !== 'smart-campus' ||
    segments[1] !== 'v1' ||
    segments[2] !== 'gateways' ||
    segments[4] !== 'status'
  ) {
    throw new Error('Invalid gateway MQTT topic');
  }
  return { gatewayId: GatewayIdSchema.parse(segments[3]) };
};

export const MQTT_BACKEND_SUBSCRIPTIONS = [
  'smart-campus/v1/nodes/+/+',
  'smart-campus/v1/gateways/+/status',
] as const;
