import { z } from 'zod';
import { AlertSchema } from '../../alerts/alert.schema.js';
import { EventLogSchema } from '../../alerts/event-log.schema.js';
import { UtcTimestampSchema } from '../../common/timestamp.schema.js';
import { LampSnapshotSchema } from '../../snapshots/lamp-snapshot.schema.js';
import { NodeSnapshotSchema } from '../../snapshots/node-snapshot.schema.js';
import { SensorSnapshotSchema } from '../../snapshots/sensor-snapshot.schema.js';
import { SystemSnapshotSchema } from '../../snapshots/system-snapshot.schema.js';
import {
  RealtimeProtocolVersionSchema,
  RealtimeSequenceSchema,
  RealtimeStreamIdSchema,
} from './realtime-common.schema.js';
import { RealtimeConnectionStateV1Schema } from './realtime-connection.schema.js';

export const RealtimeDomainEventTypeSchema = z.enum([
  'SYSTEM_SNAPSHOT_UPDATED',
  'NODE_UPDATED',
  'LAMP_UPDATED',
  'SENSOR_UPDATED',
  'ALERT_UPSERTED',
  'LOG_APPENDED',
  'SYSTEM_CONNECTION_UPDATED',
]);
export const RealtimeDomainEventType = RealtimeDomainEventTypeSchema.enum;

const domainEventDraftVariants = [
  z
    .object({ eventType: z.literal('SYSTEM_SNAPSHOT_UPDATED'), payload: SystemSnapshotSchema })
    .strict(),
  z.object({ eventType: z.literal('NODE_UPDATED'), payload: NodeSnapshotSchema }).strict(),
  z.object({ eventType: z.literal('LAMP_UPDATED'), payload: LampSnapshotSchema }).strict(),
  z.object({ eventType: z.literal('SENSOR_UPDATED'), payload: SensorSnapshotSchema }).strict(),
  z.object({ eventType: z.literal('ALERT_UPSERTED'), payload: AlertSchema }).strict(),
  z.object({ eventType: z.literal('LOG_APPENDED'), payload: EventLogSchema }).strict(),
  z
    .object({
      eventType: z.literal('SYSTEM_CONNECTION_UPDATED'),
      payload: RealtimeConnectionStateV1Schema,
    })
    .strict(),
] as const;

export const RealtimeDomainEventDraftV1Schema = z.discriminatedUnion(
  'eventType',
  domainEventDraftVariants,
);

const domainEventEnvelope = {
  messageType: z.literal('DOMAIN_EVENT'),
  protocolVersion: RealtimeProtocolVersionSchema,
  streamId: RealtimeStreamIdSchema,
  sequence: RealtimeSequenceSchema,
  eventId: z.string().min(3).max(256),
  occurredAt: UtcTimestampSchema,
};

export const RealtimeDomainEventV1Schema = z
  .discriminatedUnion('eventType', [
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('SYSTEM_SNAPSHOT_UPDATED'),
        payload: SystemSnapshotSchema,
      })
      .strict(),
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('SYSTEM_CONNECTION_UPDATED'),
        payload: RealtimeConnectionStateV1Schema,
      })
      .strict(),
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('NODE_UPDATED'),
        payload: NodeSnapshotSchema,
      })
      .strict(),
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('LAMP_UPDATED'),
        payload: LampSnapshotSchema,
      })
      .strict(),
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('SENSOR_UPDATED'),
        payload: SensorSnapshotSchema,
      })
      .strict(),
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('ALERT_UPSERTED'),
        payload: AlertSchema,
      })
      .strict(),
    z
      .object({
        ...domainEventEnvelope,
        eventType: z.literal('LOG_APPENDED'),
        payload: EventLogSchema,
      })
      .strict(),
  ])
  .superRefine((event, context) => {
    if (event.eventId !== `${event.streamId}:${event.sequence}`) {
      context.addIssue({
        code: 'custom',
        path: ['eventId'],
        message: 'eventId must match streamId and sequence',
      });
    }
  });

export type RealtimeDomainEventType = z.infer<typeof RealtimeDomainEventTypeSchema>;
export type RealtimeDomainEventDraftV1 = z.infer<typeof RealtimeDomainEventDraftV1Schema>;
export type RealtimeDomainEventV1 = z.infer<typeof RealtimeDomainEventV1Schema>;
