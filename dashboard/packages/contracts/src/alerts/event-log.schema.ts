import { z } from 'zod';
import {
  EntityRefSchema,
  NonEmptyIdSchema,
  ScenarioIdSchema,
} from '../common/identifiers.schema.js';
import { JsonObjectSchema } from '../common/json.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { AlertSeveritySchema } from '../enums/health.enums.js';

export const EventTypeSchema = z.enum([
  'SYSTEM_MODE_CHANGED',
  'DAY_PHASE_CHANGED',
  'SENSOR_STATE_CHANGED',
  'MOTION_DETECTED',
  'DIRECTION_UPDATED',
  'LAMP_STATE_CHANGED',
  'NODE_HEALTH_CHANGED',
  'COMMUNICATION_UPDATED',
  'ALERT_CREATED',
  'ALERT_RESOLVED',
  'SCENARIO_STARTED',
  'SCENARIO_PAUSED',
  'SCENARIO_RESUMED',
  'SCENARIO_COMPLETED',
  'COMMAND_ACCEPTED',
  'COMMAND_REJECTED',
]);
export const EventType = EventTypeSchema.enum;
export type EventType = z.infer<typeof EventTypeSchema>;

export const EventLogSchema = z
  .object({
    id: NonEmptyIdSchema,
    timestamp: UtcTimestampSchema,
    source: EntityRefSchema,
    eventType: EventTypeSchema,
    severity: AlertSeveritySchema,
    message: z.string().trim().min(1),
    metadata: JsonObjectSchema,
    scenarioRunId: ScenarioIdSchema.optional(),
    actorId: NonEmptyIdSchema.optional(),
    correlationId: NonEmptyIdSchema.optional(),
  })
  .strict();

export type EventLog = z.infer<typeof EventLogSchema>;
