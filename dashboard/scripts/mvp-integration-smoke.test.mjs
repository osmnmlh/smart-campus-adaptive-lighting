import assert from 'node:assert/strict';
import test from 'node:test';

import {
  closeResources,
  executeSmoke,
  hasDuplicateEventAfter,
  matchesExpectedEvent,
  parseIntegrationConfig,
  redactedConfigSummary,
  withTimeout,
} from './mvp-integration-smoke.mjs';

test('parses local defaults and optional credentials', () => {
  const config = parseIntegrationConfig({});
  assert.equal(config.backendHttpUrl, 'http://127.0.0.1:3001');
  assert.equal(config.backendWsUrl, 'ws://127.0.0.1:3001/ws/v1');
  assert.equal(config.mqttUrl, 'mqtt://127.0.0.1:1883');
  assert.equal(config.mqttUsername, undefined);
  assert.equal(config.timeoutMs, 10_000);
});

test('rejects URL credentials and unsupported schemes', () => {
  assert.throws(
    () => parseIntegrationConfig({ INTEGRATION_MQTT_URL: 'mqtt://user:secret@127.0.0.1' }),
    /without URL credentials/,
  );
  assert.throws(
    () => parseIntegrationConfig({ INTEGRATION_BACKEND_HTTP_URL: 'file:///tmp/data' }),
    /must use/,
  );
});

test('redacted config never includes credential values', () => {
  const config = parseIntegrationConfig({
    INTEGRATION_MQTT_USERNAME: 'integration-user',
    INTEGRATION_MQTT_PASSWORD: 'integration-secret',
  });
  const serialized = JSON.stringify(redactedConfigSummary(config));
  assert.doesNotMatch(serialized, /integration-user|integration-secret/);
  assert.match(serialized, /mqttPasswordConfigured/);
});

test('bounded wait rejects on timeout', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 10, 'bounded operation'),
    /timed out after 10 ms/,
  );
});

test('cleanup closes every resource in reverse order even after a failure', async () => {
  const order = [];
  const failures = await closeResources([
    async () => order.push('first'),
    async () => {
      order.push('second');
      throw new Error('close failed');
    },
    async () => order.push('third'),
  ]);
  assert.deepEqual(order, ['third', 'second', 'first']);
  assert.equal(failures.length, 1);
});

test('matches canonical normalized events and detects later duplicates', () => {
  const expected = { eventType: 'SENSOR_UPDATED', payload: { sensorId: 'sensor-ir-1' } };
  const event = {
    messageType: 'DOMAIN_EVENT',
    eventType: 'SENSOR_UPDATED',
    sequence: 7,
    payload: { sensorId: 'sensor-ir-1', active: true },
  };
  assert.equal(matchesExpectedEvent(event, expected), true);
  assert.equal(hasDuplicateEventAfter([event], 6, expected), true);
  assert.equal(hasDuplicateEventAfter([event], 7, expected), false);
});

test('CLI wrapper returns non-zero and emits a concise failure without a stack', async () => {
  const messages = [];
  const code = await executeSmoke(
    async () => {
      throw new Error('broker unavailable');
    },
    { error: (message) => messages.push(message) },
  );
  assert.equal(code, 1);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /FAILED - broker unavailable/);
  assert.doesNotMatch(messages[0], /\n|at executeSmoke/);
});
