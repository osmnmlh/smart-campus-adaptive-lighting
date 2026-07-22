const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const DEFAULT_WEBSOCKET_PATH = '/ws/v1';
const DEFAULT_WEBSOCKET_ORIGIN = 'http://localhost:3000';
const DEFAULT_WEBSOCKET_MAX_PAYLOAD_BYTES = 16_384;
const DEFAULT_WEBSOCKET_REPLAY_CAPACITY = 200;
const MAX_WEBSOCKET_PAYLOAD_BYTES = 1_048_576;
const MAX_WEBSOCKET_REPLAY_CAPACITY = 10_000;
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
  };
}
