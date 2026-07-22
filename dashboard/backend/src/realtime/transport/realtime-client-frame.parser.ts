import {
  REALTIME_PROTOCOL_VERSION,
  RealtimeClientMessageV1Schema,
  RealtimeRequestIdSchema,
  type RealtimeClientMessageV1,
  type RealtimeErrorCode,
  type RealtimeRequestId,
} from '@smart-campus/contracts';
import type { RawData } from 'ws';

export type ClientFrameParseResult =
  | { ok: true; message: RealtimeClientMessageV1 }
  | {
      ok: false;
      code: RealtimeErrorCode;
      safeMessage: string;
      requestId?: RealtimeRequestId;
    };

const knownMessageTypes = new Set(['REQUEST_SNAPSHOT', 'PING', 'RESUME']);

const decodeText = (data: RawData): string => {
  const bytes = Array.isArray(data)
    ? Buffer.concat(data)
    : data instanceof ArrayBuffer
      ? Buffer.from(data)
      : data;
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
};

const requestIdFrom = (value: Record<string, unknown>): RealtimeRequestId | undefined => {
  const result = RealtimeRequestIdSchema.safeParse(value.requestId);
  return result.success ? result.data : undefined;
};

export function parseRealtimeClientFrame(data: RawData, isBinary: boolean): ClientFrameParseResult {
  if (isBinary) {
    return {
      ok: false,
      code: 'BINARY_FRAME_NOT_SUPPORTED',
      safeMessage: 'Binary WebSocket frames are not supported',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeText(data));
  } catch {
    return { ok: false, code: 'INVALID_JSON', safeMessage: 'Message must contain valid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      code: 'INVALID_CLIENT_MESSAGE',
      safeMessage: 'Message does not match the realtime client contract',
    };
  }

  const candidate = parsed as Record<string, unknown>;
  const requestId = requestIdFrom(candidate);
  if (candidate.protocolVersion !== REALTIME_PROTOCOL_VERSION) {
    return {
      ok: false,
      code: 'UNSUPPORTED_PROTOCOL_VERSION',
      safeMessage: 'Unsupported realtime protocol version',
      ...(requestId === undefined ? {} : { requestId }),
    };
  }
  if (typeof candidate.messageType === 'string' && !knownMessageTypes.has(candidate.messageType)) {
    return {
      ok: false,
      code: 'UNKNOWN_MESSAGE_TYPE',
      safeMessage: 'Unknown realtime client message type',
      ...(requestId === undefined ? {} : { requestId }),
    };
  }

  const result = RealtimeClientMessageV1Schema.safeParse(candidate);
  if (!result.success) {
    return {
      ok: false,
      code: 'INVALID_CLIENT_MESSAGE',
      safeMessage: 'Message does not match the realtime client contract',
      ...(requestId === undefined ? {} : { requestId }),
    };
  }
  return { ok: true, message: result.data };
}
