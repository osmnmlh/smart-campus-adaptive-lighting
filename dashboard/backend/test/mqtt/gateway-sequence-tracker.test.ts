import { describe, expect, it } from 'vitest';

import { GatewaySequenceTracker } from '../../src/mqtt/application/gateway-sequence-tracker.js';
import { gatewayEnvelope, heartbeatMessage } from './mqtt-fixtures.js';

describe('GatewaySequenceTracker', () => {
  it('accepts the first gateway session', () =>
    expect(new GatewaySequenceTracker().observe(gatewayEnvelope())).toEqual({
      kind: 'FIRST',
      gapSize: 0,
    }));

  it('accepts the next gateway sequence', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe(gatewayEnvelope(heartbeatMessage({ sequence: 1 }), 1));
    expect(tracker.observe(gatewayEnvelope(heartbeatMessage({ sequence: 2 }), 2))).toEqual({
      kind: 'NEXT',
      gapSize: 0,
    });
  });

  it('records a gateway sequence gap without rejecting node payload', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe(gatewayEnvelope(heartbeatMessage({ sequence: 1 }), 1));
    expect(tracker.observe(gatewayEnvelope(heartbeatMessage({ sequence: 2 }), 5))).toEqual({
      kind: 'GAP',
      gapSize: 3,
    });
    expect(tracker.getState()?.gapCount).toBe(3);
  });

  it('diagnoses stale gateway sequence', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe(gatewayEnvelope(heartbeatMessage(), 5));
    expect(tracker.observe(gatewayEnvelope(heartbeatMessage({ sequence: 2 }), 4))).toEqual({
      kind: 'STALE_SEQUENCE',
      gapSize: 0,
    });
  });

  it('accepts higher gateway boot as restart', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe(gatewayEnvelope());
    const next = { ...gatewayEnvelope(), gatewayBootId: 'BOOT_00000002', gatewaySequence: 1 };
    expect(tracker.observe(next)).toEqual({ kind: 'RESTART', gapSize: 0 });
    expect(tracker.getState()?.restartCount).toBe(1);
  });

  it('diagnoses unexpected sequence on gateway restart', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe(gatewayEnvelope());
    const next = { ...gatewayEnvelope(), gatewayBootId: 'BOOT_00000002', gatewaySequence: 4 };
    expect(tracker.observe(next)).toEqual({ kind: 'RESTART', gapSize: 3 });
  });

  it('rejects a lower gateway boot session diagnostically', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe({ ...gatewayEnvelope(), gatewayBootId: 'BOOT_00000010' });
    expect(tracker.observe({ ...gatewayEnvelope(), gatewayBootId: 'BOOT_00000009' })).toEqual({
      kind: 'STALE_BOOT',
      gapSize: 0,
    });
  });

  it('returns defensive gateway state', () => {
    const tracker = new GatewaySequenceTracker();
    tracker.observe(gatewayEnvelope());
    const state = tracker.getState();
    if (state === null) throw new Error('Expected state');
    state.latestGatewaySequence = 99;
    expect(tracker.getState()?.latestGatewaySequence).toBe(1);
  });
});
