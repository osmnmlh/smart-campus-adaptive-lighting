import { Inject } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import type { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import {
  DEFAULT_REALTIME_PATH,
  type RealtimeClientMessageV1,
  type RealtimeErrorMessageV1,
  type RealtimeResyncReason,
  type RealtimeServerMessageV1,
} from '@smart-campus/contracts';
import WebSocket, { type RawData } from 'ws';

import {
  REALTIME_CLOCK,
  REALTIME_DATA_MODE,
  REALTIME_PUBLISHER,
  type RealtimeClock,
  type RealtimeDataModePort,
  type RealtimePublisherPort,
} from '../domain/realtime-ports.js';
import { RealtimeSnapshotService } from '../application/realtime-snapshot.service.js';
import { parseRealtimeClientFrame } from './realtime-client-frame.parser.js';
import { RealtimeConnectionRegistry } from './realtime-connection.registry.js';

const MAX_INVALID_MESSAGES = 3;
const POLICY_VIOLATION_CLOSE_CODE = 1008;

@WebSocketGateway({ path: DEFAULT_REALTIME_PATH })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly registry = new RealtimeConnectionRegistry();

  constructor(
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisherPort,
    private readonly snapshotService: RealtimeSnapshotService,
    @Inject(REALTIME_CLOCK) private readonly clock: RealtimeClock,
    @Inject(REALTIME_DATA_MODE) private readonly dataMode: RealtimeDataModePort,
  ) {}

  handleConnection(client: WebSocket): void {
    if (!this.registry.register(client)) return;

    const unsubscribe = this.publisher.subscribe((event) => {
      this.send(client, event);
    });
    this.registry.attachSubscription(client, unsubscribe);

    client.on('message', (data: RawData, isBinary: boolean) => {
      this.handleFrame(client, data, isBinary);
    });
    client.on('error', () => {
      this.registry.remove(client);
    });
    client.once('close', () => {
      this.registry.remove(client);
    });

    this.send(client, {
      messageType: 'SERVER_READY',
      protocolVersion: 1,
      streamId: this.publisher.getStreamId(),
      cursor: this.publisher.getCurrentCursor(),
      serverTime: this.clock.now(),
      dataMode: this.dataMode.getDataMode(),
    });
    this.sendSnapshot(client);
  }

  handleDisconnect(client: WebSocket): void {
    this.registry.remove(client);
  }

  getActiveConnectionCount(): number {
    return this.registry.activeCount;
  }

  private handleFrame(client: WebSocket, data: RawData, isBinary: boolean): void {
    const result = parseRealtimeClientFrame(data, isBinary);
    if (!result.ok) {
      const errorMessage: RealtimeErrorMessageV1 = {
        messageType: 'ERROR',
        protocolVersion: 1,
        code: result.code,
        message: result.safeMessage,
        ...(result.requestId === undefined ? {} : { requestId: result.requestId }),
      };
      this.send(client, errorMessage);
      const invalidCount = this.registry.incrementInvalidMessageCount(client);
      if (invalidCount >= MAX_INVALID_MESSAGES) {
        try {
          client.close(POLICY_VIOLATION_CLOSE_CODE, 'Policy violation');
        } catch {
          this.registry.remove(client);
        }
      }
      return;
    }

    this.handleClientMessage(client, result.message);
  }

  private handleClientMessage(client: WebSocket, message: RealtimeClientMessageV1): void {
    switch (message.messageType) {
      case 'REQUEST_SNAPSHOT':
        this.sendSnapshot(client);
        return;
      case 'PING':
        this.send(client, {
          messageType: 'PONG',
          protocolVersion: 1,
          requestId: message.requestId,
          serverTime: this.clock.now(),
        });
        return;
      case 'RESUME':
        this.handleResume(client, message.streamId, message.afterSequence);
    }
  }

  private handleResume(client: WebSocket, streamId: string, afterSequence: number): void {
    if (streamId !== this.publisher.getStreamId()) {
      this.sendResync(client, 'STREAM_CHANGED');
      return;
    }

    const replay = this.publisher.replayAfter(afterSequence);
    if (replay.kind === 'REPLAY') {
      for (const event of replay.events) this.send(client, event);
      return;
    }
    this.sendResync(client, replay.kind);
  }

  private sendResync(client: WebSocket, reason: RealtimeResyncReason): void {
    this.send(client, {
      messageType: 'RESYNC_REQUIRED',
      protocolVersion: 1,
      streamId: this.publisher.getStreamId(),
      cursor: this.publisher.getCurrentCursor(),
      reason,
    });
    this.sendSnapshot(client);
  }

  private sendSnapshot(client: WebSocket): void {
    this.send(client, {
      messageType: 'SYSTEM_SNAPSHOT',
      protocolVersion: 1,
      streamId: this.publisher.getStreamId(),
      cursor: this.publisher.getCurrentCursor(),
      sentAt: this.clock.now(),
      dataMode: this.dataMode.getDataMode(),
      snapshot: this.snapshotService.getCurrentSnapshot(),
    });
  }

  private send(client: WebSocket, message: RealtimeServerMessageV1): void {
    if (client.readyState !== WebSocket.OPEN) return;
    try {
      client.send(JSON.stringify(message));
    } catch {
      this.registry.remove(client);
    }
  }
}
