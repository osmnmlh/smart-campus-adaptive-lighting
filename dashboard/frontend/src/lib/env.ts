const DEFAULT_API_URL = 'http://localhost:3001/api/v1';
const DEFAULT_WEB_SOCKET_URL = 'ws://localhost:3001/dashboard';

function readPublicValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export const publicEnv = Object.freeze({
  apiUrl: readPublicValue(process.env.NEXT_PUBLIC_API_URL, DEFAULT_API_URL),
  webSocketUrl: readPublicValue(process.env.NEXT_PUBLIC_WS_URL, DEFAULT_WEB_SOCKET_URL),
});
