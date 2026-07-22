import { describe, expect, it } from 'vitest';
import {
  BootIdSchema,
  COMMUNICATION_POLICY_V1,
  CommunicationChannelSchema,
  CommunicationNodeIdSchema,
  CommunicationPolicyV1Schema,
  GatewayIdSchema,
  GatewayMqttEnvelopeV1Schema,
  GatewayStatusMessageV1Schema,
  MQTT_RETAIN_POLICY,
  NODE_ORIGIN_WIRE_BUDGET_BYTES,
  NodeTransportEnvelopeV1Schema,
  PeerRegistryV1Schema,
  TransportSequenceSchema,
  buildGatewayStatusTopic,
  buildNodeMessageId,
  buildNodeMqttTopic,
  enrichNodeMessageForGateway,
  getMaxEspNowRetries,
  getUtf8ByteLength,
  mapMessageTypeToTopicKind,
  parseGatewayStatusTopic,
  parseNodeMessageId,
  parseNodeMqttTopic,
} from '../src/index.js';

const base = {
  schemaVersion: 1,
  nodeId: 'NODE_1',
  bootId: 'BOOT_00000001',
  sequence: 1,
  uptimeMs: 0,
} as const;
const heartbeat = () => ({
  ...base,
  messageType: 'HEARTBEAT',
  payload: { firmwareVersion: '1.0.0', communicationChannel: 6 },
});
const sensor = (nodeId: string, sensorId: string) => ({
  ...base,
  nodeId,
  messageType: 'SENSOR_EVENT',
  payload: { sensorId, state: 'ACTIVE', edge: 'RISING', eventUptimeMs: 10 },
});
const lamp = (
  nodeId: string,
  lampId: string,
  overrides: Readonly<Record<string, unknown>> = {},
) => ({
  ...base,
  nodeId,
  messageType: 'LAMP_STATE',
  payload: {
    lampId,
    operatingState: 'STANDBY',
    health: 'HEALTHY',
    brightnessPercent: 30,
    targetBrightnessPercent: 30,
    pwmDutyPercent: 30,
    ...overrides,
  },
});
const electrical = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  ...base,
  nodeId: 'NODE_2',
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
    ...overrides,
  },
});
const gatewayMetadata = {
  gatewayId: 'GW_1',
  gatewayBootId: 'BOOT_00000009',
  gatewaySequence: 7,
  receivedAt: '2026-07-22T08:00:00.000Z',
} as const;

describe('communication identity and message ID', () => {
  it.each(['NODE_1', 'NODE_2', 'NODE_3'])('accepts canonical node %s', (value) =>
    expect(CommunicationNodeIdSchema.safeParse(value).success).toBe(true),
  );
  it.each(['NODE_4', 'node-1', 'NODE_1/extra', '+'])('rejects non-canonical node %s', (value) =>
    expect(CommunicationNodeIdSchema.safeParse(value).success).toBe(false),
  );
  it('accepts GW_1 and rejects another gateway', () => {
    expect(GatewayIdSchema.safeParse('GW_1').success).toBe(true);
    expect(GatewayIdSchema.safeParse('GW_2').success).toBe(false);
  });
  it.each(['BOOT_00000001', 'BOOT_99999999'])('accepts canonical boot ID %s', (value) =>
    expect(BootIdSchema.safeParse(value).success).toBe(true),
  );
  it.each([undefined, 'BOOT_0001', 'BOOT_0000000A', 'boot_00000001'])(
    'rejects invalid boot ID %s',
    (value) => expect(BootIdSchema.safeParse(value).success).toBe(false),
  );
  it.each([1, 0xffff_ffff])('accepts sequence %s', (value) =>
    expect(TransportSequenceSchema.safeParse(value).success).toBe(true),
  );
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 0x1_0000_0000])(
    'rejects sequence %s',
    (value) => expect(TransportSequenceSchema.safeParse(value).success).toBe(false),
  );
  it('builds the canonical deterministic message ID', () => {
    const identity = { nodeId: 'NODE_1', bootId: 'BOOT_00000007', sequence: 124 } as const;
    expect(buildNodeMessageId(identity)).toBe('NODE_1:BOOT_00000007:124');
    expect(buildNodeMessageId(identity)).toBe(buildNodeMessageId(identity));
  });
  it.each([
    [{ nodeId: 'NODE_1', bootId: 'BOOT_00000001', sequence: 1 }, 'NODE_1:BOOT_00000001:1'],
    [{ nodeId: 'NODE_2', bootId: 'BOOT_00000001', sequence: 1 }, 'NODE_2:BOOT_00000001:1'],
    [{ nodeId: 'NODE_1', bootId: 'BOOT_00000002', sequence: 1 }, 'NODE_1:BOOT_00000002:1'],
    [{ nodeId: 'NODE_1', bootId: 'BOOT_00000001', sequence: 2 }, 'NODE_1:BOOT_00000001:2'],
  ] as const)('identity dimensions produce %s', (identity, expected) =>
    expect(buildNodeMessageId(identity)).toBe(expected),
  );
  it('round-trips a message ID', () =>
    expect(parseNodeMessageId('NODE_3:BOOT_00000042:17')).toEqual({
      nodeId: 'NODE_3',
      bootId: 'BOOT_00000042',
      sequence: 17,
    }));
  it.each([
    'NODE_1:BOOT_00000001:01',
    'NODE_1:BOOT_BAD:1',
    'NODE_4:BOOT_00000001:1',
    'NODE_1:BOOT_00000001:1:extra',
  ])('rejects invalid message ID %s', (value) => expect(() => parseNodeMessageId(value)).toThrow());
});

describe('node V1 envelopes and payload ownership', () => {
  it('accepts V1 and rejects missing, string, or future versions', () => {
    expect(NodeTransportEnvelopeV1Schema.safeParse(heartbeat()).success).toBe(true);
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({ ...heartbeat(), schemaVersion: undefined }).success,
    ).toBe(false);
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({ ...heartbeat(), schemaVersion: '1' }).success,
    ).toBe(false);
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({ ...heartbeat(), schemaVersion: 2 }).success,
    ).toBe(false);
  });
  it.each([1, 13])('accepts communication channel %s', (channel) =>
    expect(CommunicationChannelSchema.safeParse(channel).success).toBe(true),
  );
  it.each([0, 14, 1.5])('rejects communication channel %s', (channel) =>
    expect(CommunicationChannelSchema.safeParse(channel).success).toBe(false),
  );
  it('heartbeat requires no UTC timestamp', () =>
    expect(NodeTransportEnvelopeV1Schema.parse(heartbeat())).not.toHaveProperty('receivedAt'));
  it.each([
    ['NODE_1', 'IR1'],
    ['NODE_1', 'IR2'],
    ['NODE_2', 'IR3'],
    ['NODE_3', 'IR4'],
    ['NODE_3', 'IR5'],
  ])('accepts %s ownership of %s', (nodeId, sensorId) =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(sensor(nodeId, sensorId)).success).toBe(true),
  );
  it.each([
    ['NODE_1', 'IR5'],
    ['NODE_3', 'IR1'],
    ['NODE_2', 'IR4'],
    ['NODE_2', 'BH1750'],
  ])('rejects %s ownership of %s', (nodeId, sensorId) =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(sensor(nodeId, sensorId)).success).toBe(false),
  );
  it.each([
    ['NODE_1', 'L1'],
    ['NODE_1', 'L2'],
    ['NODE_2', 'L3'],
    ['NODE_3', 'L4'],
    ['NODE_3', 'L5'],
  ])('accepts %s ownership of %s', (nodeId, lampId) =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(lamp(nodeId, lampId)).success).toBe(true),
  );
  it.each([
    ['NODE_1', 'L5'],
    ['NODE_2', 'L1'],
    ['NODE_3', 'L3'],
  ])('rejects %s ownership of %s', (nodeId, lampId) =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(lamp(nodeId, lampId)).success).toBe(false),
  );
  it.each([0, 30, 60, 100])('accepts MVP brightness policy value %s', (value) =>
    expect(
      NodeTransportEnvelopeV1Schema.safeParse(
        lamp('NODE_2', 'L3', {
          brightnessPercent: value,
          targetBrightnessPercent: value,
          pwmDutyPercent: value,
        }),
      ).success,
    ).toBe(true),
  );
  it.each([
    ['brightnessPercent', -1],
    ['brightnessPercent', 101],
    ['targetBrightnessPercent', -1],
    ['targetBrightnessPercent', 101],
    ['pwmDutyPercent', -1],
    ['pwmDutyPercent', 101],
  ])('rejects invalid %s %s', (field, value) =>
    expect(
      NodeTransportEnvelopeV1Schema.safeParse(lamp('NODE_2', 'L3', { [field]: value })).success,
    ).toBe(false),
  );
  it('rejects ambiguous pwmDuty and classification fields', () => {
    expect(
      NodeTransportEnvelopeV1Schema.safeParse(lamp('NODE_2', 'L3', { pwmDuty: 30 })).success,
    ).toBe(false);
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({
        ...sensor('NODE_1', 'IR1'),
        payload: { ...sensor('NODE_1', 'IR1').payload, vehicleClass: 'CAR' },
      }).success,
    ).toBe(false);
  });
  it('accepts only NODE_2/L3/INA219_1 measured electrical data', () =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(electrical()).success).toBe(true));
  it.each([
    ['nodeId', 'NODE_1'],
    ['nodeId', 'NODE_3'],
  ])('rejects electrical override %s=%s', (field, value) =>
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({ ...electrical(), [field]: value }).success,
    ).toBe(false),
  );
  it.each([
    ['scopeId', 'L1'],
    ['sensorId', 'INA219_2'],
    ['dataSource', 'ESTIMATED'],
    ['dataSource', 'CALCULATED'],
  ])('rejects electrical payload %s=%s', (field, value) =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(electrical({ [field]: value })).success).toBe(
      false,
    ),
  );
  it.each([
    ['voltageV', -1],
    ['currentA', -1],
    ['powerW', -1],
    ['energyWh', -1],
    ['powerW', Number.NaN],
    ['powerW', Number.POSITIVE_INFINITY],
  ])('rejects invalid electrical %s', (field, value) =>
    expect(NodeTransportEnvelopeV1Schema.safeParse(electrical({ [field]: value })).success).toBe(
      false,
    ),
  );
  it.each([heartbeat(), sensor('NODE_1', 'IR1'), lamp('NODE_2', 'L3'), electrical()])(
    'parses a typed JSON-compatible message',
    (message) =>
      expect(() => JSON.stringify(NodeTransportEnvelopeV1Schema.parse(message))).not.toThrow(),
  );
  it('rejects message/payload mismatch and unknown types', () => {
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({ ...heartbeat(), messageType: 'SENSOR_EVENT' })
        .success,
    ).toBe(false);
    expect(
      NodeTransportEnvelopeV1Schema.safeParse({ ...heartbeat(), messageType: 'TELEMETRY' }).success,
    ).toBe(false);
  });
  it('rejects gateway fields and does not mutate input', () => {
    const input = { ...heartbeat(), gatewayId: 'GW_1' };
    expect(NodeTransportEnvelopeV1Schema.safeParse(input).success).toBe(false);
    expect(input.gatewayId).toBe('GW_1');
  });
});

describe('gateway enrichment, topics, and policy', () => {
  it('enriches deterministically without changing origin identity', () => {
    const input = sensor('NODE_1', 'IR1');
    const first = enrichNodeMessageForGateway(input, gatewayMetadata);
    const second = enrichNodeMessageForGateway(input, gatewayMetadata);
    expect(first).toEqual(second);
    expect(first.messageId).toBe('NODE_1:BOOT_00000001:1');
    expect(first.nodeMessage.sequence).toBe(1);
    expect(first.nodeMessage.bootId).toBe('BOOT_00000001');
  });
  it('gateway metadata cannot change message ID', () => {
    const valid = enrichNodeMessageForGateway(heartbeat(), gatewayMetadata);
    expect(
      GatewayMqttEnvelopeV1Schema.safeParse({ ...valid, messageId: 'NODE_1:BOOT_00000001:2' })
        .success,
    ).toBe(false);
  });
  it.each([
    ['gatewayId', 'GW_2'],
    ['gatewaySequence', 0],
    ['gatewayBootId', 'BOOT_BAD'],
    ['receivedAt', '2026-07-22T11:00:00+03:00'],
  ])('rejects invalid gateway %s', (field, value) =>
    expect(
      GatewayMqttEnvelopeV1Schema.safeParse({
        ...enrichNodeMessageForGateway(heartbeat(), gatewayMetadata),
        [field]: value,
      }).success,
    ).toBe(false),
  );
  it('gateway envelope is JSON serializable', () =>
    expect(() =>
      JSON.stringify(enrichNodeMessageForGateway(heartbeat(), gatewayMetadata)),
    ).not.toThrow());
  it.each([
    ['NODE_1', 'heartbeat'],
    ['NODE_2', 'events'],
    ['NODE_3', 'telemetry'],
    ['NODE_1', 'status'],
  ])('round-trips node topic %s/%s', (nodeId, kind) => {
    const topic = buildNodeMqttTopic(nodeId as never, kind as never);
    expect(parseNodeMqttTopic(topic)).toEqual({ nodeId, kind });
  });
  it('round-trips gateway status topic', () => {
    const topic = buildGatewayStatusTopic('GW_1');
    expect(topic).toBe('smart-campus/v1/gateways/GW_1/status');
    expect(parseGatewayStatusTopic(topic)).toEqual({ gatewayId: 'GW_1' });
  });
  it.each([
    'smart-campus/v1/nodes/NODE_1/events/extra',
    'smart-campus/v1/nodes/NODE_1',
    'smart-campus/v2/nodes/NODE_1/events',
    'smart-campus/v1/nodes/NODE_4/events',
    'smart-campus/v1/nodes/NODE_1/commands',
    'smart-campus/v1/nodes/+/events',
    'smart-campus/v1/nodes/NODE_1/#',
  ])('rejects invalid publish topic %s', (topic) =>
    expect(() => parseNodeMqttTopic(topic)).toThrow(),
  );
  it.each([
    ['HEARTBEAT', 'heartbeat'],
    ['SENSOR_EVENT', 'events'],
    ['LAMP_STATE', 'events'],
    ['ELECTRICAL_MEASUREMENT', 'telemetry'],
  ])('maps %s to %s', (type, kind) => expect(mapMessageTypeToTopicKind(type)).toBe(kind));
  it('freezes heartbeat/offline and QoS policy', () => {
    expect(COMMUNICATION_POLICY_V1).toMatchObject({
      heartbeatIntervalMs: 5000,
      offlineTimeoutMs: 15000,
      missedHeartbeatThreshold: 3,
      mqttQos: 1,
    });
    expect(
      CommunicationPolicyV1Schema.safeParse({ ...COMMUNICATION_POLICY_V1, mqttQos: 2 }).success,
    ).toBe(false);
  });
  it('rejects an inconsistent timeout', () =>
    expect(
      CommunicationPolicyV1Schema.safeParse({
        ...COMMUNICATION_POLICY_V1,
        offlineTimeoutMs: 14_999,
      }).success,
    ).toBe(false));
  it.each([
    ['HEARTBEAT', 1],
    ['SENSOR_EVENT', 2],
    ['LAMP_STATE', 2],
    ['ELECTRICAL_MEASUREMENT', 1],
  ])('uses bounded retry %s=%s', (type, retries) =>
    expect(getMaxEspNowRetries(type)).toBe(retries),
  );
  it('retains only gateway birth/status and LWT', () =>
    expect(MQTT_RETAIN_POLICY).toEqual({
      gatewayStatus: true,
      gatewayLastWill: true,
      nodeHeartbeat: false,
      nodeEvents: false,
      nodeTelemetry: false,
      nodeStatus: false,
    }));
});

describe('gateway status, peer security, and payload budget', () => {
  const status = {
    schemaVersion: 1,
    gatewayId: 'GW_1',
    gatewayBootId: 'BOOT_00000001',
    status: 'ONLINE',
    uptimeMs: 0,
    communicationChannel: 6,
    firmwareVersion: '1.0.0',
    publishedAt: '2026-07-22T08:00:00.000Z',
    transportSource: 'GATEWAY',
  };
  it.each(['ONLINE', 'OFFLINE'])('accepts gateway %s status', (value) =>
    expect(GatewayStatusMessageV1Schema.safeParse({ ...status, status: value }).success).toBe(true),
  );
  it.each([
    ['publishedAt', '2026-07-22T11:00:00+03:00'],
    ['communicationChannel', 14],
    ['gatewayId', 'GW_2'],
  ])('rejects invalid status %s', (field, value) =>
    expect(GatewayStatusMessageV1Schema.safeParse({ ...status, [field]: value }).success).toBe(
      false,
    ),
  );
  const encryptedPeer = {
    nodeId: 'NODE_1',
    macAddress: '02:00:00:00:00:01',
    encryptionMode: 'STATIC_PMK_LMK',
    keyReference: 'NVS_LMK_NODE_1',
  };
  it('accepts non-secret field encryption references', () =>
    expect(
      PeerRegistryV1Schema.safeParse({
        schemaVersion: 1,
        deploymentMode: 'FIELD',
        peers: [encryptedPeer],
      }).success,
    ).toBe(true));
  it('allows unencrypted peers only in explicit lab mode', () => {
    const peer = {
      nodeId: 'NODE_1',
      macAddress: '02:00:00:00:00:01',
      encryptionMode: 'LAB_UNENCRYPTED',
    };
    expect(
      PeerRegistryV1Schema.safeParse({ schemaVersion: 1, deploymentMode: 'LAB', peers: [peer] })
        .success,
    ).toBe(true);
    expect(
      PeerRegistryV1Schema.safeParse({ schemaVersion: 1, deploymentMode: 'FIELD', peers: [peer] })
        .success,
    ).toBe(false);
  });
  it('rejects duplicate node IDs', () =>
    expect(
      PeerRegistryV1Schema.safeParse({
        schemaVersion: 1,
        deploymentMode: 'FIELD',
        peers: [encryptedPeer, { ...encryptedPeer, macAddress: '02:00:00:00:00:02' }],
      }).success,
    ).toBe(false));
  it('rejects duplicate MAC addresses', () =>
    expect(
      PeerRegistryV1Schema.safeParse({
        schemaVersion: 1,
        deploymentMode: 'FIELD',
        peers: [
          encryptedPeer,
          { ...encryptedPeer, nodeId: 'NODE_2', keyReference: 'NVS_LMK_NODE_2' },
        ],
      }).success,
    ).toBe(false));
  it.each(['02:00:00:00:00', '02-00-00-00-00-01', 'gg:00:00:00:00:01', '02:00:00:00:00:01:02'])(
    'rejects invalid MAC %s',
    (macAddress) =>
      expect(
        PeerRegistryV1Schema.safeParse({
          schemaVersion: 1,
          deploymentMode: 'FIELD',
          peers: [{ ...encryptedPeer, macAddress }],
        }).success,
      ).toBe(false),
  );
  it('does not accept actual key material fields', () =>
    expect(
      PeerRegistryV1Schema.safeParse({
        schemaVersion: 1,
        deploymentMode: 'FIELD',
        peers: [{ ...encryptedPeer, lmk: 'not-allowed' }],
      }).success,
    ).toBe(false));
  it.each([
    ['heartbeat', heartbeat(), 177],
    ['sensor', sensor('NODE_1', 'IR1'), 198],
    ['lamp', lamp('NODE_2', 'L3'), 259],
    ['electrical', electrical(), 275],
  ] as const)('reports deterministic %s UTF-8 wire size', (_label, message, expectedBytes) => {
    const encoded = JSON.stringify(message);
    expect(getUtf8ByteLength(encoded)).toBe(new TextEncoder().encode(encoded).length);
    expect(getUtf8ByteLength(encoded)).toBe(expectedBytes);
  });
  it('sets the conservative origin budget to 220 bytes', () =>
    expect(NODE_ORIGIN_WIRE_BUDGET_BYTES).toBe(220));
});
