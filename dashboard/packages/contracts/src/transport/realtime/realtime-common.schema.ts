import { z } from 'zod';

export const REALTIME_PROTOCOL_VERSION = 1 as const;
export const DEFAULT_REALTIME_PATH = '/ws/v1' as const;

const SafeRealtimeIdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/u);

export const RealtimeProtocolVersionSchema = z.literal(REALTIME_PROTOCOL_VERSION);
export const RealtimeStreamIdSchema = z
  .string()
  .regex(/^WS_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
export const RealtimeRequestIdSchema = SafeRealtimeIdentifierSchema;
export const RealtimeSequenceSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const RealtimeCursorSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export type RealtimeProtocolVersion = z.infer<typeof RealtimeProtocolVersionSchema>;
export type RealtimeStreamId = z.infer<typeof RealtimeStreamIdSchema>;
export type RealtimeRequestId = z.infer<typeof RealtimeRequestIdSchema>;
export type RealtimeSequence = z.infer<typeof RealtimeSequenceSchema>;
export type RealtimeCursor = z.infer<typeof RealtimeCursorSchema>;
