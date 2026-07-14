import { z } from 'zod';

export const NodeHealthSchema = z.enum([
  'HEALTHY',
  'WARNING',
  'CRITICAL',
  'OFFLINE',
  'MAINTENANCE',
  'UNKNOWN',
]);
export const NodeHealth = NodeHealthSchema.enum;
export type NodeHealth = z.infer<typeof NodeHealthSchema>;

export const LampOperatingStateSchema = z.enum(['OFF', 'STANDBY', 'PRE_LIGHT', 'ACTIVE', 'FADING']);
export const LampOperatingState = LampOperatingStateSchema.enum;
export type LampOperatingState = z.infer<typeof LampOperatingStateSchema>;

export const LampHealthSchema = z.enum(['HEALTHY', 'WARNING', 'FAULT', 'MAINTENANCE', 'UNKNOWN']);
export const LampHealth = LampHealthSchema.enum;
export type LampHealth = z.infer<typeof LampHealthSchema>;

export const SensorHealthSchema = z.enum(['HEALTHY', 'WARNING', 'FAULT', 'UNKNOWN']);
export const SensorHealth = SensorHealthSchema.enum;
export type SensorHealth = z.infer<typeof SensorHealthSchema>;

export const AlertSeveritySchema = z.enum(['INFO', 'WARNING', 'CRITICAL', 'EMERGENCY']);
export const AlertSeverity = AlertSeveritySchema.enum;
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertStatusSchema = z.enum(['ACTIVE', 'RESOLVED']);
export const AlertStatus = AlertStatusSchema.enum;
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const CommunicationHealthSchema = z.enum(['HEALTHY', 'DEGRADED', 'LOST', 'UNKNOWN']);
export const CommunicationHealth = CommunicationHealthSchema.enum;
export type CommunicationHealth = z.infer<typeof CommunicationHealthSchema>;
