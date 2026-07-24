import { dashboardDataEnvironment } from '@/features/live-data/live-data-config';

export const publicEnv = Object.freeze({
  dataMode: dashboardDataEnvironment.dataMode?.trim() || 'simulated',
  apiUrl: dashboardDataEnvironment.httpUrl?.trim() || 'Same origin (HTTP)',
  webSocketUrl: dashboardDataEnvironment.webSocketUrl?.trim() || 'Same origin (WebSocket /ws/v1)',
});
