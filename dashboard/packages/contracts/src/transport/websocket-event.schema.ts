import { z } from 'zod';
import { AlertSchema } from '../alerts/alert.schema.js';
import { EventLogSchema } from '../alerts/event-log.schema.js';
import {
  NonEmptyIdSchema,
  ScenarioIdSchema,
  SchemaVersionSchema,
} from '../common/identifiers.schema.js';
import { NonNegativeIntegerSchema } from '../common/metric.schema.js';
import { UtcTimestampSchema } from '../common/timestamp.schema.js';
import { ScenarioRunStatusSchema } from '../enums/scenario.enums.js';
import { SystemSnapshotSchema } from '../snapshots/system-snapshot.schema.js';

export const WebSocketEventTypeSchema = z.enum([
  'system.snapshot',
  'alert.created',
  'alert.resolved',
  'event.created',
  'scenario.status',
]);
export const WebSocketEventType = WebSocketEventTypeSchema.enum;
export type WebSocketEventType = z.infer<typeof WebSocketEventTypeSchema>;

const WebSocketEventBaseShape = {
  schemaVersion: SchemaVersionSchema,
  eventId: NonEmptyIdSchema,
  emittedAt: UtcTimestampSchema,
};

export const WebSocketEventSchema = z.discriminatedUnion('type', [
  z
    .object({
      ...WebSocketEventBaseShape,
      type: z.literal('system.snapshot'),
      payload: SystemSnapshotSchema,
    })
    .strict(),
  z
    .object({
      ...WebSocketEventBaseShape,
      type: z.literal('alert.created'),
      payload: AlertSchema,
    })
    .strict(),
  z
    .object({
      ...WebSocketEventBaseShape,
      type: z.literal('alert.resolved'),
      payload: AlertSchema,
    })
    .strict(),
  z
    .object({
      ...WebSocketEventBaseShape,
      type: z.literal('event.created'),
      payload: EventLogSchema,
    })
    .strict(),
  z
    .object({
      ...WebSocketEventBaseShape,
      type: z.literal('scenario.status'),
      payload: z
        .object({
          scenarioId: ScenarioIdSchema.optional(),
          scenarioRunId: ScenarioIdSchema.optional(),
          status: ScenarioRunStatusSchema,
          elapsedMs: NonNegativeIntegerSchema,
          speed: z.union([z.literal(0.5), z.literal(1), z.literal(2), z.literal(5)]),
        })
        .strict(),
    })
    .strict(),
]);

export type WebSocketEvent = z.infer<typeof WebSocketEventSchema>;
