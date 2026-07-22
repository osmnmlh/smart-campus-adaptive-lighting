import type { INestApplication, INestApplicationContext } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import type { WebSocketServer } from 'ws';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import { RealtimeOriginPolicy } from '../security/realtime-origin-policy.js';

interface HandshakeInfo {
  origin: string;
}

export class SecureRealtimeWsAdapter extends WsAdapter {
  private readonly originPolicy: RealtimeOriginPolicy;

  constructor(
    app: INestApplicationContext,
    private readonly config: EnvironmentConfig,
  ) {
    super(app);
    this.originPolicy = new RealtimeOriginPolicy(config.websocketAllowedOrigins);
    this.setMessageParser(() => undefined);
  }

  override create(
    port: number,
    options?: Parameters<WsAdapter['create']>[1],
  ): ReturnType<WsAdapter['create']> {
    return super.create(port, {
      ...options,
      path: this.config.websocketPath,
      maxPayload: this.config.websocketMaxPayloadBytes,
      verifyClient: (info: HandshakeInfo) => this.originPolicy.isAllowed(info.origin),
    });
  }

  override bindErrorHandler(
    server: Parameters<WsAdapter['bindErrorHandler']>[0],
  ): ReturnType<WsAdapter['bindErrorHandler']> {
    const websocketServer = server as WebSocketServer;
    websocketServer.on('connection', (socket) => {
      socket.on('error', () => this.logger.warn('Realtime WebSocket client transport error'));
    });
    websocketServer.on('error', () =>
      this.logger.error('Realtime WebSocket server transport error'),
    );
    return server;
  }
}

export function configureRealtimeWebSocketAdapter(
  app: INestApplication,
  config: EnvironmentConfig,
): void {
  app.useWebSocketAdapter(new SecureRealtimeWsAdapter(app, config));
}
