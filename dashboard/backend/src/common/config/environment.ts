const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const VALID_NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof VALID_NODE_ENVIRONMENTS)[number];

export interface EnvironmentConfig {
  nodeEnv: NodeEnvironment;
  host: string;
  port: number;
  corsOrigins: string[];
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

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  return {
    nodeEnv: parseNodeEnvironment(env.NODE_ENV),
    host: env.BACKEND_HOST?.trim() || DEFAULT_HOST,
    port: parsePort(env.BACKEND_PORT),
    corsOrigins: parseCorsOrigins(env.CORS_ORIGINS),
  };
}
