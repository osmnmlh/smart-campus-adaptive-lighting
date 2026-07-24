'use client';

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { createDashboardDataConfig, dashboardDataEnvironment } from './live-data-config';
import { fetchInitialLiveData } from './live-http-client';
import {
  createLiveInitialState,
  createSimulatedLiveDataState,
  liveDataReducer,
  type LiveDataState,
} from './live-data-state';
import { RealtimeClient } from './realtime-client';

const rawModeAtBuild = dashboardDataEnvironment.dataMode?.trim() || 'simulated';
const modeAtBuild =
  rawModeAtBuild === 'live' ? 'live' : rawModeAtBuild === 'simulated' ? 'simulated' : 'invalid';
const DashboardDataContext = createContext<LiveDataState | null>(null);
const providerFallbackState =
  modeAtBuild === 'live'
    ? createLiveInitialState()
    : modeAtBuild === 'simulated'
      ? createSimulatedLiveDataState()
      : liveDataReducer(createLiveInitialState(), {
          type: 'CONFIG_ERROR',
          message:
            'Dashboard data mode is invalid. Use NEXT_PUBLIC_DASHBOARD_DATA_MODE=simulated or live.',
        });

export function DashboardDataProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(liveDataReducer, undefined, () => providerFallbackState);

  useEffect(() => {
    const config = createDashboardDataConfig(dashboardDataEnvironment, window.location.origin);
    if (!config.ok) {
      dispatch({ type: 'CONFIG_ERROR', message: config.errorMessage });
      return;
    }
    if (config.mode === 'simulated') return;

    const controller = new AbortController();
    let client: RealtimeClient | null = null;
    let onlineHandler: (() => void) | null = null;
    let active = true;
    dispatch({ type: 'CONNECTING', reconnecting: false });

    void fetchInitialLiveData(config.httpUrl, controller.signal)
      .then((initialData) => {
        if (!active) return;
        dispatch({ type: 'INITIAL_DATA', ...initialData });
        client = new RealtimeClient(config.webSocketUrl, {
          onConnecting: (reconnecting) => dispatch({ type: 'CONNECTING', reconnecting }),
          onClosed: (reconnecting) => dispatch({ type: 'TRANSPORT_CLOSED', reconnecting }),
          onMessage: (message) => {
            switch (message.messageType) {
              case 'SERVER_READY':
                dispatch({
                  type: 'SERVER_READY',
                  streamId: message.streamId,
                  cursor: message.cursor,
                  dataMode: message.dataMode,
                  serverTime: message.serverTime,
                });
                return;
              case 'SYSTEM_SNAPSHOT':
                dispatch({
                  type: 'SYSTEM_SNAPSHOT',
                  streamId: message.streamId,
                  cursor: message.cursor,
                  dataMode: message.dataMode,
                  snapshot: message.snapshot,
                });
                return;
              case 'DOMAIN_EVENT':
                dispatch({ type: 'DOMAIN_EVENT', event: message });
                return;
              case 'RESYNC_REQUIRED':
                dispatch({
                  type: 'RESYNC_REQUIRED',
                  message: `Realtime stream requested a safe resync (${message.reason}).`,
                });
                return;
              case 'ERROR':
                dispatch({ type: 'SERVER_ERROR', message: message.message });
                return;
              case 'PONG':
                return;
            }
          },
        });
        onlineHandler = () => client?.notifyOnline();
        window.addEventListener('online', onlineHandler);
        client.start();
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        dispatch({
          type: 'INITIAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Live backend data could not be loaded safely.',
        });
      });

    return () => {
      active = false;
      controller.abort();
      if (onlineHandler !== null) window.removeEventListener('online', onlineHandler);
      client?.stop();
    };
  }, []);

  const contextValue = useMemo(() => state, [state]);
  return (
    <DashboardDataContext.Provider value={contextValue}>{children}</DashboardDataContext.Provider>
  );
}

export function useDashboardData(): LiveDataState {
  const value = useContext(DashboardDataContext);
  return value ?? providerFallbackState;
}
