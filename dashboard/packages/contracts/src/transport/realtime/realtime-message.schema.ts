import { z } from 'zod';
import { UtcTimestampSchema } from '../../common/timestamp.schema.js';
import { SystemSnapshotSchema } from '../../snapshots/system-snapshot.schema.js';
import {
  RealtimeCursorSchema,
  RealtimeProtocolVersionSchema,
  RealtimeRequestIdSchema,
  RealtimeStreamIdSchema,
} from './realtime-common.schema.js';
import { RealtimeDataModeSchema } from './realtime-connection.schema.js';
import { RealtimeDomainEventV1Schema } from './realtime-domain-event.schema.js';

const protocolEnvelope = {
  protocolVersion: RealtimeProtocolVersionSchema,
};

export const RealtimeResyncReasonSchema = z.enum([
  'STREAM_CHANGED',
  'CURSOR_TOO_OLD',
  'CURSOR_AHEAD',
]);
export const RealtimeResyncReason = RealtimeResyncReasonSchema.enum;

export const RealtimeErrorCodeSchema = z.enum([
  'INVALID_JSON',
  'INVALID_CLIENT_MESSAGE',
  'UNSUPPORTED_PROTOCOL_VERSION',
  'UNKNOWN_MESSAGE_TYPE',
  'BINARY_FRAME_NOT_SUPPORTED',
]);
export const RealtimeErrorCode = RealtimeErrorCodeSchema.enum;

export const ServerReadyMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('SERVER_READY'),
    streamId: RealtimeStreamIdSchema,
    cursor: RealtimeCursorSchema,
    serverTime: UtcTimestampSchema,
    dataMode: RealtimeDataModeSchema,
  })
  .strict();

export const SystemSnapshotMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('SYSTEM_SNAPSHOT'),
    streamId: RealtimeStreamIdSchema,
    cursor: RealtimeCursorSchema,
    sentAt: UtcTimestampSchema,
    dataMode: RealtimeDataModeSchema,
    snapshot: SystemSnapshotSchema,
  })
  .strict();

export const ResyncRequiredMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('RESYNC_REQUIRED'),
    streamId: RealtimeStreamIdSchema,
    cursor: RealtimeCursorSchema,
    reason: RealtimeResyncReasonSchema,
  })
  .strict();

export const PongMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('PONG'),
    requestId: RealtimeRequestIdSchema,
    serverTime: UtcTimestampSchema,
  })
  .strict();

export const RealtimeErrorMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('ERROR'),
    requestId: RealtimeRequestIdSchema.optional(),
    code: RealtimeErrorCodeSchema,
    message: z.string().trim().min(1).max(160),
  })
  .strict();

export const RealtimeServerMessageV1Schema = z.union([
  ServerReadyMessageV1Schema,
  SystemSnapshotMessageV1Schema,
  RealtimeDomainEventV1Schema,
  ResyncRequiredMessageV1Schema,
  PongMessageV1Schema,
  RealtimeErrorMessageV1Schema,
]);

export const RequestSnapshotMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('REQUEST_SNAPSHOT'),
    requestId: RealtimeRequestIdSchema.optional(),
  })
  .strict();

export const PingMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('PING'),
    requestId: RealtimeRequestIdSchema,
  })
  .strict();

export const ResumeMessageV1Schema = z
  .object({
    ...protocolEnvelope,
    messageType: z.literal('RESUME'),
    requestId: RealtimeRequestIdSchema.optional(),
    streamId: RealtimeStreamIdSchema,
    afterSequence: RealtimeCursorSchema,
  })
  .strict();

export const RealtimeClientMessageV1Schema = z.discriminatedUnion('messageType', [
  RequestSnapshotMessageV1Schema,
  PingMessageV1Schema,
  ResumeMessageV1Schema,
]);

export type RealtimeResyncReason = z.infer<typeof RealtimeResyncReasonSchema>;
export type RealtimeErrorCode = z.infer<typeof RealtimeErrorCodeSchema>;
export type ServerReadyMessageV1 = z.infer<typeof ServerReadyMessageV1Schema>;
export type SystemSnapshotMessageV1 = z.infer<typeof SystemSnapshotMessageV1Schema>;
export type ResyncRequiredMessageV1 = z.infer<typeof ResyncRequiredMessageV1Schema>;
export type PongMessageV1 = z.infer<typeof PongMessageV1Schema>;
export type RealtimeErrorMessageV1 = z.infer<typeof RealtimeErrorMessageV1Schema>;
export type RealtimeServerMessageV1 = z.infer<typeof RealtimeServerMessageV1Schema>;
export type RequestSnapshotMessageV1 = z.infer<typeof RequestSnapshotMessageV1Schema>;
export type PingMessageV1 = z.infer<typeof PingMessageV1Schema>;
export type ResumeMessageV1 = z.infer<typeof ResumeMessageV1Schema>;
export type RealtimeClientMessageV1 = z.infer<typeof RealtimeClientMessageV1Schema>;
