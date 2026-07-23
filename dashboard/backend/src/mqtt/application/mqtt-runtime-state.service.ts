import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RealtimeConnectionStateV1Schema,
  type CommunicationNodeId,
  type RealtimeConnectionStateV1,
  type RealtimeDataMode,
  type RealtimeGatewayConnectivity,
} from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import {
  REALTIME_CLOCK,
  REALTIME_DATA_MODE,
  REALTIME_PUBLISHER,
  type RealtimeClock,
  type RealtimeDataModePort,
  type RealtimePublisherPort,
} from '../../realtime/domain/realtime-ports.js';
import { MQTT_CONFIG, type MqttRuntimeStatePort } from '../domain/mqtt-ports.js';

const allNodeIds: readonly CommunicationNodeId[] = ['NODE_1', 'NODE_2', 'NODE_3'];

@Injectable()
export class MqttRuntimeStateService implements MqttRuntimeStatePort {
  private readonly logger = new Logger(MqttRuntimeStateService.name);
  private brokerConnected = false;
  private gatewayStatus: RealtimeGatewayConnectivity = 'UNKNOWN';
  private readonly onlineNodeIds = new Set<CommunicationNodeId>();
  private currentState: RealtimeConnectionStateV1;

  constructor(
    @Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig,
    @Inject(REALTIME_CLOCK) private readonly clock: RealtimeClock,
    @Inject(REALTIME_DATA_MODE) private readonly dataMode: RealtimeDataModePort,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisherPort,
  ) {
    this.currentState = this.buildState();
    this.dataMode.setDataMode(this.currentState.dataMode);
  }

  initialize(): void {
    this.updateState();
  }

  setBrokerConnected(connected: boolean): void {
    if (this.brokerConnected === connected) return;
    this.brokerConnected = connected;
    this.updateState();
  }

  setGatewayStatus(status: Exclude<RealtimeGatewayConnectivity, 'UNKNOWN'>): void {
    if (this.gatewayStatus === status) return;
    this.gatewayStatus = status;
    this.updateState();
  }

  setNodeOnline(nodeId: CommunicationNodeId, online: boolean): void {
    const changed = online ? !this.onlineNodeIds.has(nodeId) : this.onlineNodeIds.has(nodeId);
    if (!changed) return;
    if (online) this.onlineNodeIds.add(nodeId);
    else this.onlineNodeIds.delete(nodeId);
    this.updateState();
  }

  getConnectionState(): RealtimeConnectionStateV1 {
    return RealtimeConnectionStateV1Schema.parse(this.currentState);
  }

  private updateState(): void {
    const next = this.buildState();
    const previousComparable = JSON.stringify({
      ...this.currentState,
      changedAt: undefined,
    });
    const nextComparable = JSON.stringify({ ...next, changedAt: undefined });
    if (previousComparable === nextComparable) return;
    this.currentState = next;
    this.dataMode.setDataMode(next.dataMode);
    try {
      this.publisher.publish({ eventType: 'SYSTEM_CONNECTION_UPDATED', payload: next });
    } catch {
      this.logger.warn('Realtime connection-state publication failed');
    }
  }

  private buildState(): RealtimeConnectionStateV1 {
    const mode: RealtimeDataMode = !this.config.mqttEnabled
      ? 'SIMULATED'
      : !this.brokerConnected
        ? 'DISCONNECTED'
        : this.gatewayStatus === 'ONLINE' &&
            allNodeIds.every((nodeId) => this.onlineNodeIds.has(nodeId))
          ? 'LIVE'
          : 'DEGRADED';
    return RealtimeConnectionStateV1Schema.parse({
      dataMode: mode,
      mqttEnabled: this.config.mqttEnabled,
      brokerConnected: this.brokerConnected,
      gatewayStatus: this.gatewayStatus,
      onlineNodeIds: allNodeIds.filter((nodeId) => this.onlineNodeIds.has(nodeId)),
      changedAt: this.clock.now(),
    });
  }
}
