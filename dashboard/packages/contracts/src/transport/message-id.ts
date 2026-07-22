import { z } from 'zod';
import {
  BootIdSchema,
  CommunicationNodeIdSchema,
  TransportSequenceSchema,
  type BootId,
  type CommunicationNodeId,
} from './communication-identifiers.js';

export interface NodeMessageIdentity {
  nodeId: CommunicationNodeId;
  bootId: BootId;
  sequence: number;
}

export const buildNodeMessageId = (identity: NodeMessageIdentity): string => {
  const parsed = z
    .object({
      nodeId: CommunicationNodeIdSchema,
      bootId: BootIdSchema,
      sequence: TransportSequenceSchema,
    })
    .parse(identity);
  return `${parsed.nodeId}:${parsed.bootId}:${parsed.sequence}`;
};

export const parseNodeMessageId = (value: unknown): NodeMessageIdentity => {
  if (typeof value !== 'string') throw new Error('Invalid node message ID');
  const segments = value.split(':');
  if (segments.length !== 3 || !/^[1-9]\d*$/.test(segments[2] ?? '')) {
    throw new Error('Invalid node message ID');
  }
  return z
    .object({
      nodeId: CommunicationNodeIdSchema,
      bootId: BootIdSchema,
      sequence: TransportSequenceSchema,
    })
    .strict()
    .parse({ nodeId: segments[0], bootId: segments[1], sequence: Number(segments[2]) });
};
