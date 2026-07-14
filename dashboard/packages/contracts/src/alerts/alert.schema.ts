import { z } from 'zod';
import { EntityRefSchema, NonEmptyIdSchema } from '../common/identifiers.schema.js';
import { JsonObjectSchema } from '../common/json.schema.js';
import { NonNegativeIntegerSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { AlertSeveritySchema, AlertStatusSchema } from '../enums/health.enums.js';

export const AlertCodeSchema = z.enum([
  'NODE_OFFLINE',
  'HEARTBEAT_TIMEOUT',
  'SENSOR_STUCK_ACTIVE',
  'SENSOR_STUCK_INACTIVE',
  'I2C_SENSOR_READ_FAILED',
  'LAMP_NO_CURRENT',
  'CURRENT_TOO_LOW',
  'VOLTAGE_OUT_OF_RANGE',
  'PACKET_LOSS_HIGH',
  'DIRECTION_CONFIRMATION_TIMEOUT',
  'FAIL_SAFE_ENTERED',
  'MANUAL_OVERRIDE_STARTED',
]);
export const AlertCode = AlertCodeSchema.enum;
export type AlertCode = z.infer<typeof AlertCodeSchema>;

export const AlertSchema = z
  .object({
    id: NonEmptyIdSchema,
    code: AlertCodeSchema,
    status: AlertStatusSchema,
    severity: AlertSeveritySchema,
    sourceEntity: EntityRefSchema,
    startedAt: UtcTimestampSchema,
    lastObservedAt: UtcTimestampSchema,
    resolvedAt: UtcTimestampSchema.optional(),
    durationMs: NonNegativeIntegerSchema,
    message: z.string().trim().min(1),
    probableCause: z.string().trim().min(1),
    recommendedAction: z.string().trim().min(1),
    metadata: JsonObjectSchema,
  })
  .strict();

export type Alert = z.infer<typeof AlertSchema>;
