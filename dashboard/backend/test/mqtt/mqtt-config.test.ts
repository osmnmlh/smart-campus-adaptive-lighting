import { describe, expect, it } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';

const MQTT_INTEGER_CONFIG_KEYS = {
  MQTT_CONNECT_TIMEOUT_MS: 'mqttConnectTimeoutMs',
  MQTT_RECONNECT_PERIOD_MS: 'mqttReconnectPeriodMs',
  MQTT_KEEPALIVE_SECONDS: 'mqttKeepaliveSeconds',
  MQTT_MAX_PAYLOAD_BYTES: 'mqttMaxPayloadBytes',
  MQTT_DEDUP_CAPACITY: 'mqttDedupCapacity',
  MQTT_LIVENESS_SWEEP_MS: 'mqttLivenessSweepMs',
} as const;

describe('MQTT environment configuration', () => {
  it('is disabled by default', () => expect(loadEnvironment({}).mqttEnabled).toBe(false));
  it('parses explicit true', () =>
    expect(loadEnvironment({ MQTT_ENABLED: 'true' }).mqttEnabled).toBe(true));
  it('parses explicit false', () =>
    expect(loadEnvironment({ MQTT_ENABLED: 'false' }).mqttEnabled).toBe(false));
  it.each(['TRUE', '1', 'yes', ' false '])('rejects unsafe boolean %s', (value) =>
    expect(() => loadEnvironment({ MQTT_ENABLED: value })).toThrow('Invalid MQTT_ENABLED'),
  );

  it.each(['mqtt://127.0.0.1:1883', 'mqtts://broker.example.test:8883'])(
    'accepts broker URL %s',
    (value) => expect(loadEnvironment({ MQTT_BROKER_URL: value }).mqttBrokerUrl).toBe(value),
  );
  it.each([
    'http://localhost:1883',
    'ws://localhost:1883',
    'mqtt://user:secret@localhost:1883',
    'mqtt://localhost:1883/#fragment',
    'not-a-url',
  ])('rejects unsafe broker URL %s', (value) =>
    expect(() => loadEnvironment({ MQTT_BROKER_URL: value })).toThrow('Invalid MQTT_BROKER_URL'),
  );

  it('uses the canonical default client id', () =>
    expect(loadEnvironment({}).mqttClientId).toBe('smart-campus-backend'));
  it.each(['', '   ', ' bad', 'bad value', `bad\nvalue`, 'x'.repeat(129)])(
    'rejects unsafe client id %j',
    (value) => expect(() => loadEnvironment({ MQTT_CLIENT_ID: value })).toThrow('MQTT_CLIENT_ID'),
  );

  it('keeps optional credentials out of the broker URL', () => {
    const config = loadEnvironment({ MQTT_USERNAME: 'local-user', MQTT_PASSWORD: 'local-secret' });
    expect(config.mqttUsername).toBe('local-user');
    expect(config.mqttPassword).toBe('local-secret');
    expect(config.mqttBrokerUrl).not.toContain('local-secret');
  });
  it('normalizes empty optional credentials to undefined', () => {
    const config = loadEnvironment({ MQTT_USERNAME: '', MQTT_PASSWORD: '' });
    expect(config.mqttUsername).toBeUndefined();
    expect(config.mqttPassword).toBeUndefined();
  });

  it.each([
    ['MQTT_CONNECT_TIMEOUT_MS', '5000', 5_000],
    ['MQTT_RECONNECT_PERIOD_MS', '0', 0],
    ['MQTT_KEEPALIVE_SECONDS', '30', 30],
    ['MQTT_MAX_PAYLOAD_BYTES', '16384', 16_384],
    ['MQTT_DEDUP_CAPACITY', '10000', 10_000],
    ['MQTT_LIVENESS_SWEEP_MS', '5000', 5_000],
  ] as const)('parses %s=%s', (name, value, expected) => {
    expect(loadEnvironment({ [name]: value })[MQTT_INTEGER_CONFIG_KEYS[name]]).toBe(expected);
  });

  it.each([
    ['MQTT_CONNECT_TIMEOUT_MS', '0'],
    ['MQTT_RECONNECT_PERIOD_MS', '-1'],
    ['MQTT_KEEPALIVE_SECONDS', '0'],
    ['MQTT_MAX_PAYLOAD_BYTES', '0'],
    ['MQTT_DEDUP_CAPACITY', '100001'],
    ['MQTT_LIVENESS_SWEEP_MS', '1.5'],
  ])('rejects invalid %s=%s', (name, value) => {
    expect(() => loadEnvironment({ [name]: value })).toThrow(`Invalid ${name}`);
  });
});
