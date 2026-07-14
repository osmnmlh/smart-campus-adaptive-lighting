import { describe, expect, it } from 'vitest';
import { LampSchema, NodeSchema, SensorSchema } from '../src/index.js';

describe('entity schemas', () => {
  it('accepts canonical node, lamp, and sensor entities', () => {
    expect(
      NodeSchema.safeParse({
        id: 'node-1',
        displayName: 'Node 1',
        topologyOrder: 0,
        controlledLampIds: ['lamp-1', 'lamp-2'],
        sensorIds: ['sensor-ir-1'],
      }).success,
    ).toBe(true);
    expect(
      LampSchema.safeParse({
        id: 'lamp-1',
        displayName: 'L1',
        nodeId: 'node-1',
        sensorId: 'sensor-ir-1',
        pwmChannel: 0,
        nominalPowerW: 12,
      }).success,
    ).toBe(true);
    expect(
      SensorSchema.safeParse({
        id: 'sensor-ir-1',
        displayName: 'IR1',
        nodeId: 'node-1',
        lampId: 'lamp-1',
        type: 'IR',
        optional: false,
      }).success,
    ).toBe(true);
  });

  it('rejects an empty identifier', () => {
    expect(
      NodeSchema.safeParse({
        id: '',
        displayName: 'Node 1',
        topologyOrder: 0,
        controlledLampIds: [],
        sensorIds: [],
      }).success,
    ).toBe(false);
  });

  it('rejects negative nominal power', () => {
    expect(
      LampSchema.safeParse({
        id: 'lamp-1',
        displayName: 'L1',
        nodeId: 'node-1',
        pwmChannel: 0,
        nominalPowerW: -1,
      }).success,
    ).toBe(false);
  });

  it('rejects empty identifiers in entity arrays', () => {
    expect(
      NodeSchema.safeParse({
        id: 'node-1',
        displayName: 'Node 1',
        topologyOrder: 0,
        controlledLampIds: [''],
        sensorIds: [],
      }).success,
    ).toBe(false);
  });
});
