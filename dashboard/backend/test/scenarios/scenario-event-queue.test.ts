import type { ScenarioEvent } from '@smart-campus/contracts';

import { ScenarioEventQueue } from '../../src/scenarios/domain/scenario-event-queue.js';

const sensorEvent = (atMs: number, label: string, sensorId = 'sensor-ir-1'): ScenarioEvent => ({
  atMs,
  label,
  type: 'SENSOR_ACTIVATED',
  target: { entityType: 'SENSOR', entityId: sensorId },
  payload: {},
});

describe('ScenarioEventQueue', () => {
  it('consumes events in timestamp order', () => {
    const queue = new ScenarioEventQueue(
      [sensorEvent(2_000, 'later'), sensorEvent(1_000, 'earlier')],
      5_000,
    );
    expect(queue.consumeThrough(5_000).map((event) => event.label)).toEqual(['earlier', 'later']);
  });

  it('preserves insertion order at equal timestamps', () => {
    const queue = new ScenarioEventQueue(
      [sensorEvent(1_000, 'first'), sensorEvent(1_000, 'second', 'sensor-ir-2')],
      5_000,
    );
    expect(queue.consumeThrough(1_000).map((event) => event.label)).toEqual(['first', 'second']);
  });

  it('does not mutate the caller event array', () => {
    const events = [sensorEvent(2_000, 'later'), sensorEvent(1_000, 'earlier')];
    const before = JSON.stringify(events);
    new ScenarioEventQueue(events, 5_000);
    expect(JSON.stringify(events)).toBe(before);
  });

  it('rejects events outside durationMs', () => {
    expect(() => new ScenarioEventQueue([sensorEvent(5_001, 'late')], 5_000)).toThrow(
      'within durationMs',
    );
  });

  it('rejects an event in the queue past', () => {
    expect(() => new ScenarioEventQueue([sensorEvent(99, 'past')], 5_000, 100)).toThrow(
      'in the past',
    );
  });
});
