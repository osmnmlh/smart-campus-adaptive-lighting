import { describe, expect, it } from 'vitest';

import { parseRealtimeClientFrame } from '../../src/realtime/transport/realtime-client-frame.parser.js';

const frame = (value: unknown): Buffer => Buffer.from(JSON.stringify(value));
const streamId = 'WS_00000000-0000-4000-8000-000000000016';

describe('realtime client frame parser', () => {
  it('parses REQUEST_SNAPSHOT text frames', () => {
    const result = parseRealtimeClientFrame(
      frame({ messageType: 'REQUEST_SNAPSHOT', protocolVersion: 1 }),
      false,
    );
    expect(result).toEqual({
      ok: true,
      message: { messageType: 'REQUEST_SNAPSHOT', protocolVersion: 1 },
    });
  });

  it('parses PING with its request id', () => {
    const result = parseRealtimeClientFrame(
      frame({ messageType: 'PING', protocolVersion: 1, requestId: 'ping-1' }),
      false,
    );
    expect(result.ok && result.message.messageType).toBe('PING');
  });

  it('parses RESUME from cursor zero', () => {
    const result = parseRealtimeClientFrame(
      frame({ messageType: 'RESUME', protocolVersion: 1, streamId, afterSequence: 0 }),
      false,
    );
    expect(result.ok && result.message.messageType).toBe('RESUME');
  });

  it('rejects binary frames before parsing their content', () => {
    expect(parseRealtimeClientFrame(frame({}), true)).toMatchObject({
      ok: false,
      code: 'BINARY_FRAME_NOT_SUPPORTED',
    });
  });

  it('rejects malformed JSON without leaking parser details', () => {
    expect(parseRealtimeClientFrame(Buffer.from('{invalid'), false)).toEqual({
      ok: false,
      code: 'INVALID_JSON',
      safeMessage: 'Message must contain valid JSON',
    });
  });

  it('rejects invalid UTF-8 as invalid JSON', () => {
    expect(parseRealtimeClientFrame(Buffer.from([0xc3, 0x28]), false)).toMatchObject({
      ok: false,
      code: 'INVALID_JSON',
    });
  });

  it.each([null, [], 'PING', 1])('rejects non-object JSON value %j', (value) => {
    expect(parseRealtimeClientFrame(frame(value), false)).toMatchObject({
      ok: false,
      code: 'INVALID_CLIENT_MESSAGE',
    });
  });

  it('reports a future protocol version safely', () => {
    expect(
      parseRealtimeClientFrame(
        frame({ messageType: 'PING', protocolVersion: 2, requestId: 'req-2' }),
        false,
      ),
    ).toEqual({
      ok: false,
      code: 'UNSUPPORTED_PROTOCOL_VERSION',
      safeMessage: 'Unsupported realtime protocol version',
      requestId: 'req-2',
    });
  });

  it('reports an unknown message type safely', () => {
    expect(
      parseRealtimeClientFrame(
        frame({ messageType: 'DELETE_ALL', protocolVersion: 1, requestId: 'req-3' }),
        false,
      ),
    ).toMatchObject({ ok: false, code: 'UNKNOWN_MESSAGE_TYPE', requestId: 'req-3' });
  });

  it('rejects a missing protocol version', () => {
    expect(
      parseRealtimeClientFrame(frame({ messageType: 'REQUEST_SNAPSHOT' }), false),
    ).toMatchObject({ ok: false, code: 'UNSUPPORTED_PROTOCOL_VERSION' });
  });

  it('rejects missing required PING request id', () => {
    expect(
      parseRealtimeClientFrame(frame({ messageType: 'PING', protocolVersion: 1 }), false),
    ).toMatchObject({ ok: false, code: 'INVALID_CLIENT_MESSAGE' });
  });

  it('rejects extra client message fields', () => {
    expect(
      parseRealtimeClientFrame(
        frame({ messageType: 'REQUEST_SNAPSHOT', protocolVersion: 1, internal: true }),
        false,
      ),
    ).toMatchObject({ ok: false, code: 'INVALID_CLIENT_MESSAGE' });
  });

  it('does not echo an unsafe request id in errors', () => {
    const result = parseRealtimeClientFrame(
      frame({ messageType: 'UNKNOWN', protocolVersion: 1, requestId: 'line\nbreak' }),
      false,
    );
    expect(result).not.toHaveProperty('requestId');
  });
});
