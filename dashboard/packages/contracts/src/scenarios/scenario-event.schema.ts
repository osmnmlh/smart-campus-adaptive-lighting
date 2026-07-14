import { z } from 'zod';
import {
  EntityRefSchema,
  LampIdSchema,
  NodeIdSchema,
  SensorIdSchema,
} from '../common/identifiers.schema.js';
import { NonNegativeIntegerSchema, PositiveIntegerSchema } from '../common/metric.schema.js';
import { SystemModeSchema } from '../enums/system.enums.js';

const EventBaseShape = {
  atMs: NonNegativeIntegerSchema,
  label: z.string().trim().min(1),
};

const SensorTargetSchema = z
  .object({ entityType: z.literal('SENSOR'), entityId: SensorIdSchema })
  .strict();
const NodeTargetSchema = z
  .object({ entityType: z.literal('NODE'), entityId: NodeIdSchema })
  .strict();
const LampTargetSchema = z
  .object({ entityType: z.literal('LAMP'), entityId: LampIdSchema })
  .strict();

export const ScenarioEventSchema = z.discriminatedUnion('type', [
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SENSOR_ACTIVATED'),
      target: SensorTargetSchema,
      payload: z.object({}).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SENSOR_DEACTIVATED'),
      target: SensorTargetSchema,
      payload: z.object({}).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SET_LUX'),
      target: EntityRefSchema.optional(),
      payload: z.object({ lux: z.number().finite().nonnegative() }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SET_NODE_ONLINE'),
      target: NodeTargetSchema,
      payload: z.object({ online: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SET_LAMP_CURRENT'),
      target: LampTargetSchema,
      payload: z.object({ currentA: z.number().finite().nonnegative() }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SET_LAMP_VOLTAGE'),
      target: LampTargetSchema,
      payload: z.object({ voltageV: z.number().finite().nonnegative() }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('DROP_PACKET'),
      target: EntityRefSchema,
      payload: z.object({ count: PositiveIntegerSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SET_SENSOR_ERROR'),
      target: SensorTargetSchema,
      payload: z.object({ errorCode: z.string().trim().min(1) }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('SET_SYSTEM_MODE'),
      target: EntityRefSchema.optional(),
      payload: z.object({ mode: SystemModeSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...EventBaseShape,
      type: z.literal('CLEAR_FAULT'),
      target: EntityRefSchema,
      payload: z.object({}).strict(),
    })
    .strict(),
]);

export type ScenarioEvent = z.infer<typeof ScenarioEventSchema>;
