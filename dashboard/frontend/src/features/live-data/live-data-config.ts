import { DEFAULT_REALTIME_PATH } from '@smart-campus/contracts';

export type DashboardDataMode = 'simulated' | 'live';

export type DashboardDataEnvironment = Readonly<{
  dataMode?: string | undefined;
  httpUrl?: string | undefined;
  webSocketUrl?: string | undefined;
}>;

export type DashboardDataConfig =
  | Readonly<{ ok: true; mode: 'simulated' }>
  | Readonly<{
      ok: true;
      mode: 'live';
      httpUrl: string;
      webSocketUrl: string;
    }>
  | Readonly<{ ok: false; mode: null; errorMessage: string }>;

export const dashboardDataEnvironment: DashboardDataEnvironment = {
  dataMode: process.env.NEXT_PUBLIC_DASHBOARD_DATA_MODE,
  httpUrl: process.env.NEXT_PUBLIC_BACKEND_HTTP_URL,
  webSocketUrl: process.env.NEXT_PUBLIC_BACKEND_WS_URL,
};

function normalized(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function parseUrl(value: string, protocols: readonly string[], label: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL.`);
  }
  if (!protocols.includes(url.protocol) || url.username || url.password) {
    throw new Error(`${label} uses an unsupported or unsafe URL.`);
  }
  return url;
}

function deriveWebSocketUrl(origin: string): string {
  const url = parseUrl(origin, ['http:', 'https:'], 'Browser origin');
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = DEFAULT_REALTIME_PATH;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function createDashboardDataConfig(
  environment: DashboardDataEnvironment,
  browserOrigin?: string,
): DashboardDataConfig {
  const rawMode = normalized(environment.dataMode) ?? 'simulated';
  if (rawMode !== 'simulated' && rawMode !== 'live') {
    return {
      ok: false,
      mode: null,
      errorMessage:
        'Dashboard data mode is invalid. Use NEXT_PUBLIC_DASHBOARD_DATA_MODE=simulated or live.',
    };
  }
  if (rawMode === 'simulated') return { ok: true, mode: 'simulated' };

  const httpValue = normalized(environment.httpUrl) ?? browserOrigin;
  const webSocketValue = normalized(environment.webSocketUrl);
  if (!httpValue) {
    return {
      ok: false,
      mode: null,
      errorMessage: 'Live dashboard configuration requires a browser origin or backend HTTP URL.',
    };
  }

  try {
    const httpUrl = parseUrl(httpValue, ['http:', 'https:'], 'Backend HTTP URL');
    const webSocketUrl = webSocketValue
      ? parseUrl(webSocketValue, ['ws:', 'wss:'], 'Backend WebSocket URL').toString()
      : deriveWebSocketUrl(browserOrigin ?? httpUrl.origin);
    return {
      ok: true,
      mode: 'live',
      httpUrl: httpUrl.origin,
      webSocketUrl,
    };
  } catch (error) {
    return {
      ok: false,
      mode: null,
      errorMessage:
        error instanceof Error ? error.message : 'Dashboard live data configuration is invalid.',
    };
  }
}
