import { describe, expect, it } from 'vitest';

import { NodeSequenceTracker } from '../../src/mqtt/application/node-sequence-tracker.js';
import { heartbeatMessage, mqttTimestamp } from './mqtt-fixtures.js';

const later = '2026-07-22T12:00:01.000Z';

describe('NodeSequenceTracker', () => {
  it('accepts the first node session', () => {
    expect(new NodeSequenceTracker().evaluate(heartbeatMessage(), mqttTimestamp)).toMatchObject({
      accepted: true,
      kind: 'FIRST',
      gapSize: 0,
    });
  });

  it('does not expose uncommitted evaluation state', () => {
    const tracker = new NodeSequenceTracker();
    tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    expect(tracker.getState('NODE_1')).toBeNull();
  });

  it('commits a defensive session state', () => {
    const tracker = new NodeSequenceTracker();
    const decision = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (!decision.accepted) throw new Error('Expected accepted decision');
    tracker.commit(decision);
    expect(tracker.getState('NODE_1')).toMatchObject({
      latestBootId: 'BOOT_00000001',
      latestSequence: 1,
      lastAcceptedAt: mqttTimestamp,
      online: true,
    });
  });

  it('accepts the next sequence in the same boot', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(
      tracker.evaluate(heartbeatMessage({ sequence: 2, uptimeMs: 2_000 }), later),
    ).toMatchObject({ accepted: true, kind: 'NEXT', gapSize: 0 });
  });

  it('accepts a sequence gap and counts missing origin messages', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    const gap = tracker.evaluate(heartbeatMessage({ sequence: 5, uptimeMs: 5_000 }), later);
    expect(gap).toMatchObject({ accepted: true, kind: 'GAP', gapSize: 3 });
    if (gap.accepted) expect(gap.nextState.sequenceGapCount).toBe(3);
  });

  it('marks communication degraded after a gap', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    const gap = tracker.evaluate(heartbeatMessage({ sequence: 3, uptimeMs: 3_000 }), later);
    expect(gap.accepted && gap.nextState.communicationHealth).toBe('DEGRADED');
  });

  it('requires three consecutive normal sequences to recover communication', () => {
    const tracker = new NodeSequenceTracker();
    const messages = [
      heartbeatMessage(),
      heartbeatMessage({ sequence: 3, uptimeMs: 3_000 }),
      heartbeatMessage({ sequence: 4, uptimeMs: 4_000 }),
      heartbeatMessage({ sequence: 5, uptimeMs: 5_000 }),
      heartbeatMessage({ sequence: 6, uptimeMs: 6_000 }),
    ];
    const decisions = messages.map((message) => {
      const decision = tracker.evaluate(message, mqttTimestamp);
      if (decision.accepted) tracker.commit(decision);
      return decision;
    });
    expect(decisions[3]?.accepted && decisions[3].nextState.communicationHealth).toBe('DEGRADED');
    expect(decisions[4]).toMatchObject({ accepted: true, communicationRecovered: true });
    expect(decisions[4]?.accepted && decisions[4].nextState.communicationHealth).toBe('HEALTHY');
  });

  it('resets normal recovery progress when another gap occurs', () => {
    const tracker = new NodeSequenceTracker();
    for (const sequence of [1, 3, 4, 7]) {
      const decision = tracker.evaluate(
        heartbeatMessage({ sequence, uptimeMs: sequence * 1_000 }),
        mqttTimestamp,
      );
      if (decision.accepted) tracker.commit(decision);
    }
    expect(tracker.getState('NODE_1')).toMatchObject({
      communicationHealth: 'DEGRADED',
      consecutiveNormalAfterGap: 0,
      sequenceGapCount: 3,
    });
  });

  it('rejects a lower sequence in the same boot', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage({ sequence: 2 }), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(tracker.evaluate(heartbeatMessage({ sequence: 1 }), later)).toEqual({
      accepted: false,
      kind: 'STALE_SEQUENCE',
    });
  });

  it('rejects the same sequence in the same boot', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(tracker.evaluate(heartbeatMessage(), later)).toMatchObject({
      accepted: false,
      kind: 'STALE_SEQUENCE',
    });
  });

  it('rejects uptime rollback in the same boot', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage({ uptimeMs: 2_000 }), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(tracker.evaluate(heartbeatMessage({ sequence: 2, uptimeMs: 1_999 }), later)).toEqual({
      accepted: false,
      kind: 'UPTIME_ROLLBACK',
    });
  });

  it('accepts a higher numeric boot counter as restart', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage({ bootId: 'BOOT_00000009' }), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(
      tracker.evaluate(
        heartbeatMessage({ bootId: 'BOOT_00000010', sequence: 1, uptimeMs: 0 }),
        later,
      ),
    ).toMatchObject({ accepted: true, kind: 'RESTART' });
  });

  it('compares boot counters numerically instead of lexically', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage({ bootId: 'BOOT_00000009' }), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    const restart = tracker.evaluate(
      heartbeatMessage({ bootId: 'BOOT_00000010', sequence: 1, uptimeMs: 0 }),
      later,
    );
    expect(restart.accepted && restart.nextState.restartCount).toBe(1);
  });

  it('rejects a lower numeric boot counter', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage({ bootId: 'BOOT_00000010' }), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(
      tracker.evaluate(heartbeatMessage({ bootId: 'BOOT_00000009', sequence: 100 }), later),
    ).toEqual({ accepted: false, kind: 'STALE_BOOT' });
  });

  it('accepts but diagnoses a restart not beginning at sequence one', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(
      tracker.evaluate(
        heartbeatMessage({ bootId: 'BOOT_00000002', sequence: 4, uptimeMs: 10 }),
        later,
      ),
    ).toMatchObject({ accepted: true, kind: 'RESTART_SEQUENCE_UNEXPECTED', gapSize: 3 });
  });

  it('allows uptime reset on a new boot', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage({ uptimeMs: 50_000 }), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    const restart = tracker.evaluate(
      heartbeatMessage({ bootId: 'BOOT_00000002', sequence: 1, uptimeMs: 0 }),
      later,
    );
    expect(restart.accepted && restart.nextState.latestUptimeMs).toBe(0);
  });

  it('marks an online node offline only once', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    expect(tracker.markOffline('NODE_1')?.online).toBe(false);
    expect(tracker.markOffline('NODE_1')).toBeNull();
  });

  it('reports liveness recovery on the next valid message', () => {
    const tracker = new NodeSequenceTracker();
    const first = tracker.evaluate(heartbeatMessage(), mqttTimestamp);
    if (first.accepted) tracker.commit(first);
    tracker.markOffline('NODE_1');
    expect(
      tracker.evaluate(heartbeatMessage({ sequence: 2, uptimeMs: 2_000 }), later),
    ).toMatchObject({ accepted: true, livenessRecovered: true });
  });
});
