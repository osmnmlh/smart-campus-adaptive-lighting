import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connect as connectMqtt } from 'mqtt';
import WebSocket from 'ws';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');
const vectorDirectory = path.join(repositoryRoot, 'firmware', 'test-vectors');
const DEFAULT_TIMEOUT_MS = 10_000;

const clone = (value) => JSON.parse(JSON.stringify(value));
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseUrl(name, value, protocols) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (!protocols.includes(parsed.protocol) || parsed.username !== '' || parsed.password !== '') {
    throw new Error(`${name} must use ${protocols.join(' or ')} without URL credentials`);
  }
  return parsed.toString().replace(/\/$/, '');
}

export function parseIntegrationConfig(environment = process.env) {
  return {
    backendHttpUrl: parseUrl(
      'INTEGRATION_BACKEND_HTTP_URL',
      environment.INTEGRATION_BACKEND_HTTP_URL ?? 'http://127.0.0.1:3001',
      ['http:', 'https:'],
    ),
    backendWsUrl: parseUrl(
      'INTEGRATION_BACKEND_WS_URL',
      environment.INTEGRATION_BACKEND_WS_URL ?? 'ws://127.0.0.1:3001/ws/v1',
      ['ws:', 'wss:'],
    ),
    websocketOrigin: parseUrl(
      'INTEGRATION_WS_ORIGIN',
      environment.INTEGRATION_WS_ORIGIN ?? 'http://localhost:3000',
      ['http:', 'https:'],
    ),
    mqttUrl: parseUrl(
      'INTEGRATION_MQTT_URL',
      environment.INTEGRATION_MQTT_URL ?? 'mqtt://127.0.0.1:1883',
      ['mqtt:', 'mqtts:'],
    ),
    mqttUsername: environment.INTEGRATION_MQTT_USERNAME || undefined,
    mqttPassword: environment.INTEGRATION_MQTT_PASSWORD || undefined,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export function redactedConfigSummary(config) {
  return {
    backendHttpUrl: config.backendHttpUrl,
    backendWsUrl: config.backendWsUrl,
    websocketOrigin: config.websocketOrigin,
    mqttUrl: config.mqttUrl,
    mqttUsernameConfigured: config.mqttUsername !== undefined,
    mqttPasswordConfigured: config.mqttPassword !== undefined,
    timeoutMs: config.timeoutMs,
  };
}

export async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${timeoutMs} ms`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function closeResources(closers) {
  const failures = [];
  for (const close of [...closers].reverse()) {
    try {
      await close();
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}

export function matchesExpectedEvent(message, expected) {
  if (message?.messageType !== 'DOMAIN_EVENT' || message.eventType !== expected.eventType) {
    return false;
  }
  return Object.entries(expected.payload).every(([key, value]) => message.payload?.[key] === value);
}

export function hasDuplicateEventAfter(messages, baselineSequence, expected) {
  return messages.some(
    (message) =>
      Number.isSafeInteger(message?.sequence) &&
      message.sequence > baselineSequence &&
      matchesExpectedEvent(message, expected),
  );
}

export function formatFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').trim().slice(0, 240) || 'unknown integration failure';
}

class WebSocketInbox {
  constructor(socket, timeoutMs) {
    this.socket = socket;
    this.timeoutMs = timeoutMs;
    this.pending = [];
    this.history = [];
    this.waiters = [];
    socket.on('message', (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      this.history.push(message);
      const waiterIndex = this.waiters.findIndex((waiter) => waiter.predicate(message));
      if (waiterIndex === -1) {
        this.pending.push(message);
        return;
      }
      const [waiter] = this.waiters.splice(waiterIndex, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    });
  }

  waitFor(predicate, label) {
    const pendingIndex = this.pending.findIndex(predicate);
    if (pendingIndex !== -1) {
      const [message] = this.pending.splice(pendingIndex, 1);
      return Promise.resolve(message);
    }
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: undefined };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index !== -1) this.waiters.splice(index, 1);
        reject(new Error(`${label} was not received within ${this.timeoutMs} ms`));
      }, this.timeoutMs);
      this.waiters.push(waiter);
    });
  }
}

async function readVector(name) {
  return JSON.parse(await readFile(path.join(vectorDirectory, name), 'utf8'));
}

function deriveHeartbeat(canonical, nodeId, gatewaySequence) {
  const envelope = clone(canonical);
  envelope.gatewaySequence = gatewaySequence;
  envelope.receivedAt = `2026-07-23T08:00:0${gatewaySequence - 1}.000Z`;
  envelope.nodeMessage.nodeId = nodeId;
  envelope.nodeMessage.sequence = 1;
  envelope.nodeMessage.uptimeMs = 5000;
  envelope.messageId = `${nodeId}:${envelope.nodeMessage.bootId}:1`;
  return envelope;
}

function withGatewaySequence(canonical, gatewaySequence) {
  const envelope = clone(canonical);
  envelope.gatewaySequence = gatewaySequence;
  envelope.receivedAt = `2026-07-23T08:00:0${gatewaySequence - 1}.000Z`;
  return envelope;
}

function nodeTopic(envelope) {
  const { nodeId, messageType } = envelope.nodeMessage;
  const kind =
    messageType === 'HEARTBEAT'
      ? 'heartbeat'
      : messageType === 'ELECTRICAL_MEASUREMENT'
        ? 'telemetry'
        : 'events';
  return `smart-campus/v1/nodes/${nodeId}/${kind}`;
}

async function loadSmokeMessages() {
  const [gatewayOnline, gatewayOffline, heartbeat, sensor, lamp, electrical] = await Promise.all([
    readVector('gateway-online-status.json'),
    readVector('gateway-offline-status.json'),
    readVector('heartbeat-gateway-envelope.json'),
    readVector('sensor-event-gateway-envelope.json'),
    readVector('lamp-state-gateway-envelope.json'),
    readVector('electrical-gateway-envelope.json'),
  ]);
  return {
    gatewayOnline,
    gatewayOffline,
    nodeMessages: [
      deriveHeartbeat(heartbeat, 'NODE_1', 1),
      deriveHeartbeat(heartbeat, 'NODE_2', 2),
      deriveHeartbeat(heartbeat, 'NODE_3', 3),
      withGatewaySequence(sensor, 4),
      withGatewaySequence(lamp, 5),
      withGatewaySequence(electrical, 6),
    ],
  };
}

function connectWebSocket(url, origin, timeoutMs) {
  let socket;
  return withTimeout(
    new Promise((resolve, reject) => {
      socket = new WebSocket(url, { origin });
      socket.once('open', () => resolve(socket));
      socket.once('error', () => reject(new Error('backend WebSocket is unavailable')));
    }),
    timeoutMs,
    'backend WebSocket connection',
  ).catch((error) => {
    socket?.terminate();
    throw error;
  });
}

function connectMqttClient(config) {
  let client;
  return withTimeout(
    new Promise((resolve, reject) => {
      client = connectMqtt(config.mqttUrl, {
        clean: true,
        connectTimeout: config.timeoutMs,
        reconnectPeriod: 0,
        clientId: `smart-campus-mvp-smoke-${process.pid}`,
        ...(config.mqttUsername === undefined ? {} : { username: config.mqttUsername }),
        ...(config.mqttPassword === undefined ? {} : { password: config.mqttPassword }),
      });
      client.once('connect', () => resolve(client));
      client.once('error', () => reject(new Error('MQTT broker is unavailable')));
    }),
    config.timeoutMs,
    'MQTT broker connection',
  ).catch((error) => {
    client?.end(true);
    throw error;
  });
}

async function publishJson(client, topic, payload, options) {
  await client.publishAsync(topic, JSON.stringify(payload), options);
}

async function fetchJson(url, timeoutMs, label) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new Error(`${label} is unavailable`);
  }
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSmoke(environment = process.env, logger = console) {
  const config = parseIntegrationConfig(environment);
  logger.log(`MVP integration smoke config: ${JSON.stringify(redactedConfigSummary(config))}`);
  const closers = [];
  let mqttClient;
  let gatewayOffline;
  try {
    const health = await fetchJson(
      `${config.backendHttpUrl}/health`,
      config.timeoutMs,
      'backend health',
    );
    assert(health?.status === 'ok', 'backend health response is not ready');

    const socket = await connectWebSocket(
      config.backendWsUrl,
      config.websocketOrigin,
      config.timeoutMs,
    );
    closers.push(
      () =>
        new Promise((resolve) => {
          if (socket.readyState === WebSocket.CLOSED) return resolve();
          socket.once('close', resolve);
          socket.close();
        }),
    );
    const inbox = new WebSocketInbox(socket, config.timeoutMs);
    const ready = await inbox.waitFor(
      (message) => message?.messageType === 'SERVER_READY',
      'SERVER_READY',
    );
    await inbox.waitFor((message) => message?.messageType === 'SYSTEM_SNAPSHOT', 'SYSTEM_SNAPSHOT');

    mqttClient = await connectMqttClient(config);
    closers.push(() => mqttClient.endAsync(false));

    if (ready.dataMode === 'DISCONNECTED') {
      await inbox.waitFor(
        (message) =>
          matchesExpectedEvent(message, {
            eventType: 'SYSTEM_CONNECTION_UPDATED',
            payload: { brokerConnected: true },
          }),
        'broker-connected realtime event',
      );
    }

    const messages = await loadSmokeMessages();
    gatewayOffline = messages.gatewayOffline;
    await publishJson(mqttClient, 'smart-campus/v1/gateways/GW_1/status', messages.gatewayOnline, {
      qos: 1,
      retain: true,
    });
    for (const envelope of messages.nodeMessages) {
      await publishJson(mqttClient, nodeTopic(envelope), envelope, { qos: 1, retain: false });
    }

    const expectedEvents = [
      { eventType: 'NODE_UPDATED', payload: { nodeId: 'node-1', online: true } },
      { eventType: 'NODE_UPDATED', payload: { nodeId: 'node-2', online: true } },
      { eventType: 'NODE_UPDATED', payload: { nodeId: 'node-3', online: true } },
      { eventType: 'SENSOR_UPDATED', payload: { sensorId: 'sensor-ir-1', active: true } },
      {
        eventType: 'LAMP_UPDATED',
        payload: { lampId: 'lamp-3', brightnessPercent: 30 },
      },
    ];
    for (const expected of expectedEvents) {
      await inbox.waitFor(
        (message) => matchesExpectedEvent(message, expected),
        `${expected.eventType} ${JSON.stringify(expected.payload)}`,
      );
    }
    await inbox.waitFor(
      (message) =>
        message?.messageType === 'DOMAIN_EVENT' &&
        message.eventType === 'LAMP_UPDATED' &&
        message.payload?.lampId === 'lamp-3' &&
        message.payload?.electrical?.power?.value === 6 &&
        message.payload?.electrical?.power?.source === 'MEASURED',
      'measured L3 electrical event',
    );
    await inbox.waitFor(
      (message) =>
        matchesExpectedEvent(message, {
          eventType: 'SYSTEM_CONNECTION_UPDATED',
          payload: { dataMode: 'LIVE' },
        }),
      'LIVE connection event',
    );

    const snapshotEnvelope = await fetchJson(
      `${config.backendHttpUrl}/api/v1/system/snapshot`,
      config.timeoutMs,
      'REST snapshot',
    );
    const snapshot = snapshotEnvelope?.data;
    assert(
      ['node-1', 'node-2', 'node-3'].every(
        (nodeId) => snapshot?.nodes?.find((node) => node.nodeId === nodeId)?.online === true,
      ),
      'REST snapshot does not show all three nodes online',
    );
    assert(
      snapshot?.sensors?.find((sensor) => sensor.sensorId === 'sensor-ir-1')?.active === true,
      'REST snapshot does not contain the canonical active sensor',
    );
    const lamp = snapshot?.lamps?.find((candidate) => candidate.lampId === 'lamp-3');
    assert(
      lamp?.brightnessPercent === 30,
      'REST snapshot does not contain the canonical lamp state',
    );
    assert(
      lamp?.electrical?.power?.value === 6 && lamp?.electrical?.power?.source === 'MEASURED',
      'REST snapshot does not contain measured L3 electrical data',
    );

    const sensorEnvelope = messages.nodeMessages[3];
    const baselineSequence = Math.max(
      0,
      ...inbox.history
        .filter((message) => Number.isSafeInteger(message?.sequence))
        .map((message) => message.sequence),
    );
    await publishJson(mqttClient, nodeTopic(sensorEnvelope), sensorEnvelope, {
      qos: 1,
      retain: false,
      dup: true,
    });
    await sleep(350);
    assert(
      !hasDuplicateEventAfter(inbox.history, baselineSequence, {
        eventType: 'SENSOR_UPDATED',
        payload: { sensorId: 'sensor-ir-1' },
      }),
      'duplicate messageId produced a second normalized sensor event',
    );

    await mqttClient.publishAsync(
      'smart-campus/v1/nodes/NODE_1/events',
      JSON.stringify({ schemaVersion: 1, invalid: true }),
      { qos: 1, retain: false },
    );
    await sleep(150);
    const finalHealth = await fetchJson(
      `${config.backendHttpUrl}/health`,
      config.timeoutMs,
      'backend health after invalid payload',
    );
    assert(
      finalHealth?.status === 'ok',
      'backend did not remain healthy after invalid MQTT payload',
    );

    logger.log(
      'MVP integration smoke: PASSED (MQTT ingestion, normalized WebSocket events, REST snapshot, deduplication, invalid-payload resilience)',
    );
    return {
      status: 'PASSED',
      eventCount: inbox.history.filter((message) => message?.messageType === 'DOMAIN_EVENT').length,
    };
  } finally {
    if (mqttClient !== undefined && gatewayOffline !== undefined && mqttClient.connected) {
      try {
        await publishJson(mqttClient, 'smart-campus/v1/gateways/GW_1/status', gatewayOffline, {
          qos: 1,
          retain: true,
        });
      } catch {
        // Best-effort retained status cleanup; connection cleanup still runs.
      }
    }
    const cleanupFailures = await closeResources(closers);
    if (cleanupFailures.length > 0) {
      logger.warn(`MVP integration smoke cleanup warnings: ${cleanupFailures.length}`);
    }
  }
}

export async function executeSmoke(run = runSmoke, logger = console) {
  try {
    await run();
    return 0;
  } catch (error) {
    logger.error(`MVP integration smoke: FAILED - ${formatFailure(error)}`);
    return 1;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) process.exitCode = await executeSmoke();
