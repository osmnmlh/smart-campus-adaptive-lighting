import { z } from 'zod';
import { CommunicationNodeIdSchema } from './communication-identifiers.js';

export const MacAddressSchema = z.string().regex(/^[0-9A-F]{2}(?::[0-9A-F]{2}){5}$/);
export const EncryptionModeSchema = z.enum(['STATIC_PMK_LMK', 'LAB_UNENCRYPTED']);
export const PeerRegistryEntrySchema = z
  .object({
    nodeId: CommunicationNodeIdSchema,
    macAddress: MacAddressSchema,
    encryptionMode: EncryptionModeSchema,
    keyReference: z
      .string()
      .regex(/^NVS_LMK_NODE_[123]$/)
      .optional(),
  })
  .strict()
  .superRefine((peer, context) => {
    if (peer.encryptionMode === 'STATIC_PMK_LMK' && peer.keyReference === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['keyReference'],
        message: 'Encrypted peers require a non-secret NVS key reference',
      });
    }
    if (peer.encryptionMode === 'LAB_UNENCRYPTED' && peer.keyReference !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['keyReference'],
        message: 'Lab unencrypted peers cannot reference encryption keys',
      });
    }
  });

export const PeerRegistryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    deploymentMode: z.enum(['FIELD', 'LAB']),
    peers: z.array(PeerRegistryEntrySchema).min(1),
  })
  .strict()
  .superRefine((registry, context) => {
    const nodes = new Set<string>();
    const macs = new Set<string>();
    registry.peers.forEach((peer, index) => {
      if (nodes.has(peer.nodeId))
        context.addIssue({
          code: 'custom',
          path: ['peers', index, 'nodeId'],
          message: 'Duplicate node ID',
        });
      if (macs.has(peer.macAddress))
        context.addIssue({
          code: 'custom',
          path: ['peers', index, 'macAddress'],
          message: 'Duplicate MAC address',
        });
      if (registry.deploymentMode === 'FIELD' && peer.encryptionMode !== 'STATIC_PMK_LMK') {
        context.addIssue({
          code: 'custom',
          path: ['peers', index, 'encryptionMode'],
          message: 'Field mode requires static PMK/LMK encryption',
        });
      }
      nodes.add(peer.nodeId);
      macs.add(peer.macAddress);
    });
  });

export type PeerRegistryV1 = z.infer<typeof PeerRegistryV1Schema>;
