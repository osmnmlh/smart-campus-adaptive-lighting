import { z } from 'zod';
import { PercentageSchema } from '../common/metric.schema.js';
import { LampHealthSchema, LampOperatingStateSchema } from '../enums/health.enums.js';
import {
  CommunicationChannelSchema,
  CommunicationLampIdSchema,
  ElectricalSensorIdSchema,
  IrSensorIdSchema,
  UptimeMsSchema,
} from './communication-identifiers.js';

export const NodeMessageTypeSchema = z.enum([
  'HEARTBEAT',
  'SENSOR_EVENT',
  'LAMP_STATE',
  'ELECTRICAL_MEASUREMENT',
]);
export const NodeMessageType = NodeMessageTypeSchema.enum;

export const NodeHeartbeatPayloadV1Schema = z
  .object({
    firmwareVersion: z.string().trim().min(1).max(64),
    communicationChannel: CommunicationChannelSchema,
  })
  .strict();

export const SensorEventPayloadV1Schema = z
  .object({
    sensorId: IrSensorIdSchema,
    state: z.enum(['ACTIVE', 'INACTIVE']),
    edge: z.enum(['RISING', 'FALLING']).optional(),
    eventUptimeMs: UptimeMsSchema.optional(),
  })
  .strict();

export const LampStatePayloadV1Schema = z
  .object({
    lampId: CommunicationLampIdSchema,
    operatingState: LampOperatingStateSchema,
    health: LampHealthSchema,
    brightnessPercent: PercentageSchema,
    targetBrightnessPercent: PercentageSchema,
    pwmDutyPercent: PercentageSchema,
  })
  .strict();

export const ElectricalMeasurementPayloadV1Schema = z
  .object({
    sensorId: ElectricalSensorIdSchema,
    scopeType: z.literal('LAMP'),
    scopeId: z.literal('L3'),
    voltageV: z.number().finite().nonnegative(),
    currentA: z.number().finite().nonnegative(),
    powerW: z.number().finite().nonnegative(),
    energyWh: z.number().finite().nonnegative(),
    dataSource: z.literal('MEASURED'),
  })
  .strict();

export type NodeMessageType = z.infer<typeof NodeMessageTypeSchema>;
export type NodeHeartbeatPayloadV1 = z.infer<typeof NodeHeartbeatPayloadV1Schema>;
export type SensorEventPayloadV1 = z.infer<typeof SensorEventPayloadV1Schema>;
export type LampStatePayloadV1 = z.infer<typeof LampStatePayloadV1Schema>;
export type ElectricalMeasurementPayloadV1 = z.infer<typeof ElectricalMeasurementPayloadV1Schema>;
