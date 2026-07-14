import { z } from 'zod';

export const ScenarioRunStatusSchema = z.enum(['IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED']);
export const ScenarioRunStatus = ScenarioRunStatusSchema.enum;
export type ScenarioRunStatus = z.infer<typeof ScenarioRunStatusSchema>;

export const ScenarioControlActionSchema = z.enum(['PAUSE', 'RESUME', 'STEP', 'SET_SPEED']);
export const ScenarioControlAction = ScenarioControlActionSchema.enum;
export type ScenarioControlAction = z.infer<typeof ScenarioControlActionSchema>;

export const ScenarioEventTypeSchema = z.enum([
  'SENSOR_ACTIVATED',
  'SENSOR_DEACTIVATED',
  'SET_LUX',
  'SET_NODE_ONLINE',
  'SET_LAMP_CURRENT',
  'SET_LAMP_VOLTAGE',
  'DROP_PACKET',
  'SET_SENSOR_ERROR',
  'SET_SYSTEM_MODE',
  'CLEAR_FAULT',
]);
export const ScenarioEventType = ScenarioEventTypeSchema.enum;
export type ScenarioEventType = z.infer<typeof ScenarioEventTypeSchema>;
