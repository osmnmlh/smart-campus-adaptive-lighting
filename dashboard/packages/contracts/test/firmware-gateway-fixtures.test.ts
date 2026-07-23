import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GatewayMqttEnvelopeV1Schema, GatewayStatusMessageV1Schema } from '../src/index.js';

const fixturesDirectory = resolve(import.meta.dirname, '../../../../firmware/test-vectors');

const readFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(fixturesDirectory, name), 'utf8'));

describe('gateway firmware JSON contract fixtures', () => {
  it.each([
    'heartbeat-gateway-envelope.json',
    'sensor-event-gateway-envelope.json',
    'lamp-state-gateway-envelope.json',
    'electrical-gateway-envelope.json',
  ])('parses %s with the package-root gateway envelope schema', (name) => {
    expect(GatewayMqttEnvelopeV1Schema.safeParse(readFixture(name)).success).toBe(true);
  });

  it.each(['gateway-online-status.json', 'gateway-offline-status.json'])(
    'parses %s with the package-root gateway status schema',
    (name) => {
      expect(GatewayStatusMessageV1Schema.safeParse(readFixture(name)).success).toBe(true);
    },
  );
});
