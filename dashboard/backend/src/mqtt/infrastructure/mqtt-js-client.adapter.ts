import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IClientOptions, ISubscriptionMap, MqttClient } from 'mqtt';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import {
  MQTT_CONFIG,
  MQTT_JS_CLIENT_FACTORY,
  type MqttClientPort,
  type MqttConnectionListener,
  type MqttConnectionState,
  type MqttMessageListener,
  type MqttSubscription,
} from '../domain/mqtt-ports.js';
import type { MqttJsClientFactoryPort } from './mqtt-js-client.factory.js';

@Injectable()
export class MqttJsClientAdapter implements MqttClientPort {
  private readonly logger = new Logger(MqttJsClientAdapter.name);
  private readonly messageListeners = new Set<MqttMessageListener>();
  private readonly connectionListeners = new Set<MqttConnectionListener>();
  private client: MqttClient | null = null;
  private started = false;
  private connected = false;
  private subscribedForConnection = false;

  constructor(
    @Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig,
    @Inject(MQTT_JS_CLIENT_FACTORY) private readonly factory: MqttJsClientFactoryPort,
  ) {}

  async start(): Promise<void> {
    if (!this.config.mqttEnabled || this.started) return;
    this.started = true;
    const options: IClientOptions = {
      clientId: this.config.mqttClientId,
      clean: true,
      connectTimeout: this.config.mqttConnectTimeoutMs,
      reconnectPeriod: this.config.mqttReconnectPeriodMs,
      keepalive: this.config.mqttKeepaliveSeconds,
      resubscribe: false,
      queueQoSZero: false,
      ...(this.config.mqttUsername === undefined ? {} : { username: this.config.mqttUsername }),
      ...(this.config.mqttPassword === undefined ? {} : { password: this.config.mqttPassword }),
    };
    const client = this.factory.create(this.config.mqttBrokerUrl, options);
    this.client = client;
    client.on('connect', () => this.transitionConnection('CONNECTED'));
    client.on('reconnect', () => this.transitionConnection('DISCONNECTED'));
    client.on('offline', () => this.transitionConnection('DISCONNECTED'));
    client.on('close', () => this.transitionConnection('DISCONNECTED'));
    client.on('error', () => this.logger.warn('MQTT client transport error'));
    client.on('message', (topic, payload, packet) => {
      for (const listener of [...this.messageListeners]) {
        try {
          listener({
            topic,
            payload: Uint8Array.from(payload),
            qos: packet.qos,
            retain: packet.retain,
            dup: packet.dup,
          });
        } catch {
          this.logger.warn('MQTT application message listener failed');
        }
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    this.subscribedForConnection = false;
    const client = this.client;
    this.client = null;
    if (client !== null) {
      client.removeAllListeners();
      await client.endAsync(false);
    }
    this.transitionConnection('DISCONNECTED');
  }

  async subscribe(subscriptions: readonly MqttSubscription[]): Promise<void> {
    if (
      !this.config.mqttEnabled ||
      this.client === null ||
      !this.connected ||
      this.subscribedForConnection
    ) {
      return;
    }
    const topicMap = Object.fromEntries(
      subscriptions.map((subscription) => [subscription.topicFilter, { qos: subscription.qos }]),
    ) as ISubscriptionMap;
    try {
      const grants = await this.client.subscribeAsync(topicMap);
      if (grants.some((grant) => grant.qos !== 1)) {
        throw new Error('MQTT subscription was not granted at QoS 1');
      }
      this.subscribedForConnection = true;
    } catch {
      this.logger.warn('MQTT subscription failed');
      throw new Error('MQTT subscription failed');
    }
  }

  onMessage(listener: MqttMessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onConnectionState(listener: MqttConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private transitionConnection(state: MqttConnectionState): void {
    const connected = state === 'CONNECTED';
    if (this.connected === connected) return;
    this.connected = connected;
    if (!connected) this.subscribedForConnection = false;
    for (const listener of [...this.connectionListeners]) {
      try {
        listener(state);
      } catch {
        this.logger.warn('MQTT connection-state listener failed');
      }
    }
  }
}
