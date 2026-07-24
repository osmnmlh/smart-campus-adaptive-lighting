const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const DEFAULT_WEBSOCKET_PATH = '/ws/v1';
const DEFAULT_WEBSOCKET_ORIGIN = 'http://localhost:3000';
const DEFAULT_WEBSOCKET_MAX_PAYLOAD_BYTES = 16_384;
const DEFAULT_WEBSOCKET_REPLAY_CAPACITY = 200;
const MAX_WEBSOCKET_PAYLOAD_BYTES = 1_048_576;
const MAX_WEBSOCKET_REPLAY_CAPACITY = 10_000;
const DEFAULT_MQTT_BROKER_URL = 'mqtt://127.0.0.1:1883';
const DEFAULT_MQTT_CLIENT_ID = 'smart-campus-backend';
const DEFAULT_MQTT_CONNECT_TIMEOUT_MS = 5_000;
const DEFAULT_MQTT_RECONNECT_PERIOD_MS = 1_000;
const DEFAULT_MQTT_KEEPALIVE_SECONDS = 30;
const DEFAULT_MQTT_MAX_PAYLOAD_BYTES = 16_384;
const DEFAULT_MQTT_DEDUP_CAPACITY = 10_000;
const DEFAULT_MQTT_LIVENESS_SWEEP_MS = 5_000;
const DEFAULT_ENERGY_NOMINAL_LAMP_POWER_W = 10;
const DEFAULT_ENERGY_MEASUREMENT_STALE_MS = 15_000;
const DEFAULT_ENERGY_MAX_INTEGRATION_GAP_MS = 30_000;
const VALID_NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof VALID_NODE_ENVIRONMENTS)[number];

export interface EnvironmentConfig {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  corsOrigins: string[];
  websocketPath: string;
  websocketAllowedOrigins: string[];
  websocketMaxPayloadBytes: number;
  websocketReplayCapacity: number;
  mqttEnabled: boolean;
  mqttBrokerUrl: string;
  mqttClientId: string;
  mqttUsername: string | undefined;
  mqttPassword: string | undefined;
  mqttConnectTimeoutMs: number;
  mqttReconnectPeriodMs: number;
  mqttKeepaliveSeconds: number;
  mqttMaxPayloadBytes: number;
  mqttDedupCapacity: number;
  mqttLivenessSweepMs: number;
  energyNominalLampPowerW: number;
  energyMeasurementStaleMs: number;
  energyMaxIntegrationGapMs: number;
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const nodeEnvironment = value ?? 'development';

  if (!VALID_NODE_ENVIRONMENTS.some((candidate) => candidate === nodeEnvironment)) {
    throw new Error(`Invalid NODE_ENV: expected one of ${VALID_NODE_ENVIRONMENTS.join(', ')}`);
  }

  return nodeEnvironment as NodeEnvironment;
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value === '') {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error('Invalid BACKEND_PORT: expected an integer between 1 and 65535');
  }

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid BACKEND_PORT: expected an integer between 1 and 65535');
  }

  return port;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseWebsocketPath(value: string | undefined): string {
  const path = value?.trim() || DEFAULT_WEBSOCKET_PATH;
  if (!/^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*)?$/.test(path)) {
    throw new Error('Invalid WEBSOCKET_PATH: expected an absolute URL path');
  }
  return path;
}

function parseWebsocketOrigins(value: string | undefined): string[] {
  const entries = (value ?? DEFAULT_WEBSOCKET_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (entries.length === 0) {
    throw new Error('Invalid WEBSOCKET_ALLOWED_ORIGINS: expected at least one origin');
  }

  return entries.map((origin) => {
    if (origin.includes('*')) {
      throw new Error('Invalid WEBSOCKET_ALLOWED_ORIGINS: wildcards are not supported');
    }
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error('Invalid WEBSOCKET_ALLOWED_ORIGINS: expected exact HTTP origins');
    }
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin !== origin) {
      throw new Error('Invalid WEBSOCKET_ALLOWED_ORIGINS: expected exact HTTP origins');
    }
    return origin;
  });
}

function parseBoundedInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  maximum: number,
): number {
  if (value === undefined || value === '') return defaultValue;
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${name}: expected an integer between 1 and ${maximum}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error(`Invalid ${name}: expected an integer between 1 and ${maximum}`);
  }
  return parsed;
}

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Invalid ${name}: expected true or false`);
}

function parseMqttBrokerUrl(value: string | undefined): string {
  const brokerUrl = value?.trim() || DEFAULT_MQTT_BROKER_URL;
  let parsed: URL;
  try {
    parsed = new URL(brokerUrl);
  } catch {
    throw new Error('Invalid MQTT_BROKER_URL: expected an mqtt or mqtts URL');
  }
  if (
    (parsed.protocol !== 'mqtt:' && parsed.protocol !== 'mqtts:') ||
    parsed.hash !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    throw new Error('Invalid MQTT_BROKER_URL: expected an mqtt or mqtts URL without credentials');
  }
  return brokerUrl;
}

function parseMqttClientId(value: string | undefined): string {
  const clientId = value === undefined ? DEFAULT_MQTT_CLIENT_ID : value;
  if (
    clientId.length > 128 ||
    clientId.trim() !== clientId ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(clientId)
  ) {
    throw new Error('Invalid MQTT_CLIENT_ID: expected a safe non-empty identifier');
  }
  return clientId;
}

function parseOptionalCredential(value: string | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  return value;
}

function parseMqttInteger(
  name: string,
  value: string | undefined,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === '') return defaultValue;
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${name}: expected an integer between ${minimum} and ${maximum}`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Invalid ${name}: expected an integer between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function parsePositiveFiniteNumber(
  name: string,
  value: string | undefined,
  defaultValue: number,
  maximum: number,
): number {
  if (value === undefined || value === '') return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`Invalid ${name}: expected a positive number no greater than ${maximum}`);
  }
  return parsed;
}

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  return {
    nodeEnv: parseNodeEnvironment(env.NODE_ENV),
    host: env.BACKEND_HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.BACKEND_PORT),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    websocketPath: parseWebsocketPath(env.WEBSOCKET_PATH),
    websocketAllowedOrigins: parseWebsocketOrigins(env.WEBSOCKET_ALLOWED_ORIGINS),
    websocketMaxPayloadBytes: parseBoundedInteger(
      'WEBSOCKET_MAX_PAYLOAD_BYTES',
      env.WEBSOCKET_MAX_PAYLOAD_BYTES,
      DEFAULT_WEBSOCKET_MAX_PAYLOAD_BYTES,
      MAX_WEBSOCKET_PAYLOAD_BYTES,
    ),
    websocketReplayCapacity: parseBoundedInteger(
      'WEBSOCKET_REPLAY_CAPACITY',
      env.WEBSOCKET_REPLAY_CAPACITY,
      DEFAULT_WEBSOCKET_REPLAY_CAPACITY,
      MAX_WEBSOCKET_REPLAY_CAPACITY,
    ),
    mqttEnabled: parseBoolean('MQTT_ENABLED', env.MQTT_ENABLED, false),
    mqttBrokerUrl: parseMqttBrokerUrl(env.MQTT_BROKER_URL),
    mqttClientId: parseMqttClientId(env.MQTT_CLIENT_ID),
    mqttUsername: parseOptionalCredential(env.MQTT_USERNAME),
    mqttPassword: parseOptionalCredential(env.MQTT_PASSWORD),
    mqttConnectTimeoutMs: parseMqttInteger(
      'MQTT_CONNECT_TIMEOUT_MS',
      env.MQTT_CONNECT_TIMEOUT_MS,
      DEFAULT_MQTT_CONNECT_TIMEOUT_MS,
      1,
      60_000,
    ),
    mqttReconnectPeriodMs: parseMqttInteger(
      'MQTT_RECONNECT_PERIOD_MS',
      env.MQTT_RECONNECT_PERIOD_MS,
      DEFAULT_MQTT_RECONNECT_PERIOD_MS,
      0,
      60_000,
    ),
    mqttKeepaliveSeconds: parseMqttInteger(
      'MQTT_KEEPALIVE_SECONDS',
      env.MQTT_KEEPALIVE_SECONDS,
      DEFAULT_MQTT_KEEPALIVE_SECONDS,
      1,
      65_535,
    ),
    mqttMaxPayloadBytes: parseMqttInteger(
      'MQTT_MAX_PAYLOAD_BYTES',
      env.MQTT_MAX_PAYLOAD_BYTES,
      DEFAULT_MQTT_MAX_PAYLOAD_BYTES,
      1,
      1_048_576,
    ),
    mqttDedupCapacity: parseMqttInteger(
      'MQTT_DEDUP_CAPACITY',
      env.MQTT_DEDUP_CAPACITY,
      DEFAULT_MQTT_DEDUP_CAPACITY,
      1,
      100_000,
    ),
    mqttLivenessSweepMs: parseMqttInteger(
      'MQTT_LIVENESS_SWEEP_MS',
      env.MQTT_LIVENESS_SWEEP_MS,
      DEFAULT_MQTT_LIVENESS_SWEEP_MS,
      1,
      60_000,
    ),
    energyNominalLampPowerW: parsePositiveFiniteNumber(
      'ENERGY_NOMINAL_LAMP_POWER_W',
      env.ENERGY_NOMINAL_LAMP_POWER_W,
      DEFAULT_ENERGY_NOMINAL_LAMP_POWER_W,
      1_000,
    ),
    energyMeasurementStaleMs: parseBoundedInteger(
      'ENERGY_MEASUREMENT_STALE_MS',
      env.ENERGY_MEASUREMENT_STALE_MS,
      DEFAULT_ENERGY_MEASUREMENT_STALE_MS,
      3_600_000,
    ),
    energyMaxIntegrationGapMs: parseBoundedInteger(
      'ENERGY_MAX_INTEGRATION_GAP_MS',
      env.ENERGY_MAX_INTEGRATION_GAP_MS,
      DEFAULT_ENERGY_MAX_INTEGRATION_GAP_MS,
      300_000,
    ),
  };
}
