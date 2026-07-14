import { z } from 'zod';
import { EntityTypeSchema } from '../enums/system.enums.js';

export const NonEmptyIdSchema = z.string().trim().min(1);
export const NodeIdSchema = z.string().regex(/^node-[1-9]\d*$/);
export const LampIdSchema = z.string().regex(/^lamp-[1-9]\d*$/);
export const SensorIdSchema = z
  .string()
  .regex(/^sensor-(?:ir-[1-9]\d*|bh1750-[1-9]\d*|ina219-[1-9]\d*)$/);
export const ScenarioIdSchema = NonEmptyIdSchema;

export const EntityRefSchema = z
  .object({
    entityType: EntityTypeSchema,
    entityId: NonEmptyIdSchema,
  })
  .strict();

export const SchemaVersionSchema = z.literal(1);

export type NodeId = z.infer<typeof NodeIdSchema>;
export type LampId = z.infer<typeof LampIdSchema>;
export type SensorId = z.infer<typeof SensorIdSchema>;
export type ScenarioId = z.infer<typeof ScenarioIdSchema>;
export type EntityRef = z.infer<typeof EntityRefSchema>;
export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;
