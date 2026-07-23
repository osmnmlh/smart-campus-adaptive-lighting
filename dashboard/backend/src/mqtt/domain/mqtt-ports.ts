import type { RealtimeConnectionStateV1 } from '@smart-campus/contracts';

export const MQTT_CONFIG = Symbol('MQTT_CONFIG');
export const MQTT_CLIENT = Symbol('MQTT_CLIENT');
export const MQTT_JS_CLIENT_FACTORY = Symbol('MQTT_JS_CLIENT_FACTORY');
export const MQTT_LIVENESS_SCHEDULER = Symbol('MQTT_LIVENESS_SCHEDULER');

export type MqttQos = 0 | 1 | 2;
export type MqttConnectionState = 'CONNECTED' | 'DISCONNECTED';

export interface MqttSubscription {
  topicFilter: string;
  qos: 1;
}

export interface MqttInboundMessage {
  topic: string;
  payload: Uint8Array;
  qos: MqttQos;
  retain: boolean;
  dup: boolean;
}

export type MqttMessageListener = (message: MqttInboundMessage) => void;
export type MqttConnectionListener = (state: MqttConnectionState) => void;

export interface MqttClientPort {
  start(): Promise<void>;
  stop(): Promise<void>;
  subscribe(subscriptions: readonly MqttSubscription[]): Promise<void>;
  onMessage(listener: MqttMessageListener): () => void;
  onConnectionState(listener: MqttConnectionListener): () => void;
}

export interface LivenessSchedulerPort {
  start(task: () => void): void;
  stop(): void;
}

export interface MqttRuntimeStatePort {
  getConnectionState(): RealtimeConnectionStateV1;
}
