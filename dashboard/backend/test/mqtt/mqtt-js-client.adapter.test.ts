import { EventEmitter } from 'node:events';

import type { IClientOptions, ISubscriptionGrant, MqttClient } from 'mqtt';
import { describe, expect, it, vi } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';
import type { MqttInboundMessage } from '../../src/mqtt/domain/mqtt-ports.js';
import type { MqttJsClientFactoryPort } from '../../src/mqtt/infrastructure/mqtt-js-client.factory.js';
import { MqttJsClientAdapter } from '../../src/mqtt/infrastructure/mqtt-js-client.adapter.js';

const NODE_FILTER = 'smart-campus/v1/nodes/+/+';
const GATEWAY_FILTER = 'smart-campus/v1/gateways/+/status';
const SUBSCRIPTIONS = [
  { topicFilter: NODE_FILTER, qos: 1 as const },
  { topicFilter: GATEWAY_FILTER, qos: 1 as const },
] as const;

function createHarness(overrides: NodeJS.ProcessEnv = {}) {
  const emitter = new EventEmitter();
  const subscribeAsync = vi.fn(async (): Promise<ISubscriptionGrant[]> => [
    { topic: NODE_FILTER, qos: 1 },
    { topic: GATEWAY_FILTER, qos: 1 },
  ]);
  const endAsync = vi.fn(async () => undefined);
  const client = Object.assign(emitter, { subscribeAsync, endAsync }) as unknown as MqttClient;
  let capturedUrl: string | undefined;
  let capturedOptions: IClientOptions | undefined;
  const factory: MqttJsClientFactoryPort = {
    create(url, options) {
      capturedUrl = url;
      capturedOptions = options;
      return client;
    },
  };
  const config = loadEnvironment({ MQTT_ENABLED: 'true', ...overrides });
  const adapter = new MqttJsClientAdapter(config, factory);
  return {
    adapter,
    emitter,
    subscribeAsync,
    endAsync,
    getCapturedUrl: () => capturedUrl,
    getCapturedOptions: () => capturedOptions,
  };
}

describe('MqttJsClientAdapter', () => {
  it('does not create a client when MQTT is disabled', async () => {
    const create = vi.fn();
    const adapter = new MqttJsClientAdapter(loadEnvironment({}), { create });
    await adapter.start();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates one client when start is called repeatedly', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    await harness.adapter.start();
    expect(harness.getCapturedUrl()).toBe('mqtt://127.0.0.1:1883');
  });

  it('uses explicit clean-session and reconnect-safe options', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    expect(harness.getCapturedOptions()).toMatchObject({
      clientId: 'smart-campus-backend',
      clean: true,
      connectTimeout: 5_000,
      reconnectPeriod: 1_000,
      keepalive: 30,
      resubscribe: false,
      queueQoSZero: false,
    });
  });

  it('passes credentials separately from the broker URL', async () => {
    const harness = createHarness({ MQTT_USERNAME: 'user', MQTT_PASSWORD: 'secret' });
    await harness.adapter.start();
    expect(harness.getCapturedUrl()).not.toContain('secret');
    expect(harness.getCapturedOptions()).toMatchObject({ username: 'user', password: 'secret' });
  });

  it('emits connection state only on meaningful transitions', async () => {
    const harness = createHarness();
    const listener = vi.fn();
    harness.adapter.onConnectionState(listener);
    await harness.adapter.start();
    harness.emitter.emit('connect');
    harness.emitter.emit('connect');
    harness.emitter.emit('offline');
    harness.emitter.emit('close');
    expect(listener.mock.calls).toEqual([['CONNECTED'], ['DISCONNECTED']]);
  });

  it('allows a connection listener to unsubscribe', async () => {
    const harness = createHarness();
    const listener = vi.fn();
    const unsubscribe = harness.adapter.onConnectionState(listener);
    unsubscribe();
    await harness.adapter.start();
    harness.emitter.emit('connect');
    expect(listener).not.toHaveBeenCalled();
  });

  it('normalizes incoming MQTT.js messages into the application port', async () => {
    const harness = createHarness();
    const messages: MqttInboundMessage[] = [];
    harness.adapter.onMessage((message) => messages.push(message));
    await harness.adapter.start();
    harness.emitter.emit('message', 'topic/a', Buffer.from('{"ok":true}'), {
      qos: 1,
      retain: false,
      dup: true,
    });
    expect(messages).toEqual([
      {
        topic: 'topic/a',
        payload: Uint8Array.from(Buffer.from('{"ok":true}')),
        qos: 1,
        retain: false,
        dup: true,
      },
    ]);
  });

  it('allows a message listener to unsubscribe', async () => {
    const harness = createHarness();
    const listener = vi.fn();
    const unsubscribe = harness.adapter.onMessage(listener);
    unsubscribe();
    await harness.adapter.start();
    harness.emitter.emit('message', 'topic/a', Buffer.from('{}'), {
      qos: 1,
      retain: false,
      dup: false,
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribes to both allowlisted filters at QoS 1', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    harness.emitter.emit('connect');
    await harness.adapter.subscribe(SUBSCRIPTIONS);
    expect(harness.subscribeAsync).toHaveBeenCalledWith({
      'smart-campus/v1/nodes/+/+': { qos: 1 },
      'smart-campus/v1/gateways/+/status': { qos: 1 },
    });
  });

  it('does not subscribe before the transport connects', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    await harness.adapter.subscribe(SUBSCRIPTIONS);
    expect(harness.subscribeAsync).not.toHaveBeenCalled();
  });

  it('subscribes only once per connection', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    harness.emitter.emit('connect');
    await harness.adapter.subscribe(SUBSCRIPTIONS);
    await harness.adapter.subscribe(SUBSCRIPTIONS);
    expect(harness.subscribeAsync).toHaveBeenCalledTimes(1);
  });

  it('allows an explicit subscription restore after reconnect', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    harness.emitter.emit('connect');
    await harness.adapter.subscribe(SUBSCRIPTIONS);
    harness.emitter.emit('reconnect');
    harness.emitter.emit('connect');
    await harness.adapter.subscribe(SUBSCRIPTIONS);
    expect(harness.subscribeAsync).toHaveBeenCalledTimes(2);
  });

  it('rejects a subscription not granted at QoS 1', async () => {
    const harness = createHarness();
    harness.subscribeAsync.mockResolvedValueOnce([{ topic: NODE_FILTER, qos: 0 }]);
    await harness.adapter.start();
    harness.emitter.emit('connect');
    await expect(harness.adapter.subscribe(SUBSCRIPTIONS)).rejects.toThrow(
      'MQTT subscription failed',
    );
  });

  it('ends the client gracefully and only once', async () => {
    const harness = createHarness();
    await harness.adapter.start();
    harness.emitter.emit('connect');
    await harness.adapter.stop();
    await harness.adapter.stop();
    expect(harness.endAsync).toHaveBeenCalledTimes(1);
    expect(harness.endAsync).toHaveBeenCalledWith(false);
  });
});
