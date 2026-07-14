import { z } from 'zod';

export const SystemModeSchema = z.enum([
  'AUTO_ADAPTIVE',
  'SCHEDULED',
  'MANUAL',
  'MAINTENANCE',
  'FAIL_SAFE',
]);
export const SystemMode = SystemModeSchema.enum;
export type SystemMode = z.infer<typeof SystemModeSchema>;

export const DirectionSchema = z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT', 'NONE', 'UNKNOWN']);
export const Direction = DirectionSchema.enum;
export type Direction = z.infer<typeof DirectionSchema>;

export const DayPhaseSchema = z.enum(['DAY', 'NIGHT', 'UNKNOWN']);
export const DayPhase = DayPhaseSchema.enum;
export type DayPhase = z.infer<typeof DayPhaseSchema>;

export const EntityTypeSchema = z.enum(['SYSTEM', 'NODE', 'LAMP', 'SENSOR', 'LINK']);
export const EntityType = EntityTypeSchema.enum;
export type EntityType = z.infer<typeof EntityTypeSchema>;
