import {
  enrichNodeMessageForGateway,
  type GatewayMqttEnvelopeV1,
  type GatewayStatusMessageV1,
  type NodeTransportEnvelopeV1,
} from '@smart-campus/contracts';

export const mqttTimestamp = '2026-07-22T12:00:00.000Z';

export const heartbeatMessage = (
  overrides: Readonly<Record<string, unknown>> = {},
): NodeTransportEnvelopeV1 =>
  ({
    schemaVersion: 1,
    nodeId: 'NODE_1',
    bootId: 'BOOT_00000001',
    sequence: 1,
    uptimeMs: 1_000,
    messageType: 'HEARTBEAT',
    payload: { firmwareVersion: '1.0.0', communicationChannel: 6 },
    ...overrides,
  }) as NodeTransportEnvelopeV1;

export const sensorMessage = (
  overrides: Readonly<Record<string, unknown>> = {},
): NodeTransportEnvelopeV1 =>
  ({
    schemaVersion: 1,
    nodeId: 'NODE_1',
    bootId: 'BOOT_00000001',
    sequence: 2,
    uptimeMs: 2_000,
    messageType: 'SENSOR_EVENT',
    payload: { sensorId: 'IR1', state: 'ACTIVE', edge: 'RISING', eventUptimeMs: 1_950 },
    ...overrides,
  }) as NodeTransportEnvelopeV1;

export const lampMessage = (
  overrides: Readonly<Record<string, unknown>> = {},
): NodeTransportEnvelopeV1 =>
  ({
    schemaVersion: 1,
    nodeId: 'NODE_2',
    bootId: 'BOOT_00000001',
    sequence: 1,
    uptimeMs: 1_000,
    messageType: 'LAMP_STATE',
    payload: {
      lampId: 'L3',
      operatingState: 'ACTIVE',
      health: 'HEALTHY',
      brightnessPercent: 60,
      targetBrightnessPercent: 60,
      pwmDutyPercent: 60,
    },
    ...overrides,
  }) as NodeTransportEnvelopeV1;

export const electricalMessage = (
  overrides: Readonly<Record<string, unknown>> = {},
): NodeTransportEnvelopeV1 =>
  ({
    schemaVersion: 1,
    nodeId: 'NODE_2',
    bootId: 'BOOT_00000001',
    sequence: 2,
    uptimeMs: 2_000,
    messageType: 'ELECTRICAL_MEASUREMENT',
    payload: {
      sensorId: 'INA219_1',
      scopeType: 'LAMP',
      scopeId: 'L3',
      voltageV: 12,
      currentA: 0.5,
      powerW: 6,
      energyWh: 1.25,
      dataSource: 'MEASURED',
    },
    ...overrides,
  }) as NodeTransportEnvelopeV1;

export const gatewayEnvelope = (
  nodeMessage: NodeTransportEnvelopeV1 = heartbeatMessage(),
  gatewaySequence = nodeMessage.sequence,
): GatewayMqttEnvelopeV1 =>
  enrichNodeMessageForGateway(nodeMessage, {
    gatewayId: 'GW_1',
    gatewayBootId: 'BOOT_00000001',
    gatewaySequence,
    receivedAt: mqttTimestamp,
  });

export const gatewayStatus = (status: 'ONLINE' | 'OFFLINE' = 'ONLINE'): GatewayStatusMessageV1 => ({
  schemaVersion: 1,
  gatewayId: 'GW_1',
  gatewayBootId: 'BOOT_00000001',
  status,
  uptimeMs: 1_000,
  communicationChannel: 6,
  firmwareVersion: '1.0.0',
  publishedAt: mqttTimestamp,
  transportSource: 'GATEWAY',
});

export const encodeMqttPayload = (value: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(value));
