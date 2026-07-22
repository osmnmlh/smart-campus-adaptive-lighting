import { z } from 'zod';

export const CommunicationNodeIdSchema = z.enum(['NODE_1', 'NODE_2', 'NODE_3']);
export const GatewayIdSchema = z.literal('GW_1');
export const CommunicationLampIdSchema = z.enum(['L1', 'L2', 'L3', 'L4', 'L5']);
export const IrSensorIdSchema = z.enum(['IR1', 'IR2', 'IR3', 'IR4', 'IR5']);
export const AmbientSensorIdSchema = z.literal('BH1750');
export const ElectricalSensorIdSchema = z.literal('INA219_1');
export const BootIdSchema = z.string().regex(/^BOOT_[0-9]{8}$/);
export const TransportSequenceSchema = z.number().int().min(1).max(0xffff_ffff);
export const UptimeMsSchema = z.number().int().finite().nonnegative();
export const CommunicationChannelSchema = z.number().int().min(1).max(13);

export type CommunicationNodeId = z.infer<typeof CommunicationNodeIdSchema>;
export type GatewayId = z.infer<typeof GatewayIdSchema>;
export type CommunicationLampId = z.infer<typeof CommunicationLampIdSchema>;
export type IrSensorId = z.infer<typeof IrSensorIdSchema>;
export type BootId = z.infer<typeof BootIdSchema>;
