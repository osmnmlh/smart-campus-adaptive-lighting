import { describe, expect, it } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';
import { RealtimeOriginPolicy } from '../../src/realtime/security/realtime-origin-policy.js';

describe('realtime environment configuration', () => {
  it('uses /ws/v1 as the default path', () => {
    expect(loadEnvironment({}).websocketPath).toBe('/ws/v1');
  });

  it('allows only the local dashboard origin by default', () => {
    expect(loadEnvironment({}).websocketAllowedOrigins).toEqual(['http://localhost:3000']);
  });

  it('uses a 16 KiB payload limit by default', () => {
    expect(loadEnvironment({}).websocketMaxPayloadBytes).toBe(16_384);
  });

  it('uses a replay capacity of 200 by default', () => {
    expect(loadEnvironment({}).websocketReplayCapacity).toBe(200);
  });

  it('parses a custom versioned path', () => {
    expect(loadEnvironment({ WEBSOCKET_PATH: '/realtime/v2' }).websocketPath).toBe('/realtime/v2');
  });

  it('trims comma-separated exact origins', () => {
    expect(
      loadEnvironment({
        WEBSOCKET_ALLOWED_ORIGINS: ' http://localhost:3000,https://dashboard.example.test:8443 ',
      }).websocketAllowedOrigins,
    ).toEqual(['http://localhost:3000', 'https://dashboard.example.test:8443']);
  });

  it('parses a custom payload limit', () => {
    expect(loadEnvironment({ WEBSOCKET_MAX_PAYLOAD_BYTES: '32768' }).websocketMaxPayloadBytes).toBe(
      32_768,
    );
  });

  it('parses the maximum replay capacity', () => {
    expect(loadEnvironment({ WEBSOCKET_REPLAY_CAPACITY: '10000' }).websocketReplayCapacity).toBe(
      10_000,
    );
  });

  it.each(['ws/v1', '/ws/v1/', '/ws v1', '/ws/v1?debug=true', '/ws/v1#fragment'])(
    'rejects invalid WebSocket path %s',
    (value) => {
      expect(() => loadEnvironment({ WEBSOCKET_PATH: value })).toThrow('Invalid WEBSOCKET_PATH');
    },
  );

  it.each([
    '*',
    'http://*.example.test',
    'ws://localhost:3000',
    'http://localhost:3000/path',
    'http://localhost:3000?query=1',
    'not-an-origin',
  ])('rejects unsafe WebSocket origin %s', (value) => {
    expect(() => loadEnvironment({ WEBSOCKET_ALLOWED_ORIGINS: value })).toThrow(
      'Invalid WEBSOCKET_ALLOWED_ORIGINS',
    );
  });

  it.each(['0', '-1', '1.5', '1048577', 'bytes'])('rejects invalid payload limit %s', (value) => {
    expect(() => loadEnvironment({ WEBSOCKET_MAX_PAYLOAD_BYTES: value })).toThrow(
      'Invalid WEBSOCKET_MAX_PAYLOAD_BYTES',
    );
  });

  it.each(['0', '-1', '1.5', '10001', 'many'])('rejects invalid replay capacity %s', (value) => {
    expect(() => loadEnvironment({ WEBSOCKET_REPLAY_CAPACITY: value })).toThrow(
      'Invalid WEBSOCKET_REPLAY_CAPACITY',
    );
  });
});

describe('realtime origin policy', () => {
  const policy = new RealtimeOriginPolicy([
    'http://localhost:3000',
    'https://dashboard.example.test',
  ]);

  it.each(['http://localhost:3000', 'https://dashboard.example.test'])(
    'allows exact configured origin %s',
    (origin) => {
      expect(policy.isAllowed(origin)).toBe(true);
    },
  );

  it('rejects a missing Origin header', () => {
    expect(policy.isAllowed(undefined)).toBe(false);
  });

  it.each([
    'http://localhost:3000.evil.test',
    'http://localhost:3000/',
    'HTTP://LOCALHOST:3000',
    'https://dashboard.example.test.evil',
  ])('rejects non-exact origin %s', (origin) => {
    expect(policy.isAllowed(origin)).toBe(false);
  });
});
