import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadEnvironment } from '../../src/common/config/environment.js';
import { IntervalLivenessScheduler } from '../../src/mqtt/infrastructure/interval-liveness-scheduler.js';

describe('IntervalLivenessScheduler', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs on the configured deterministic sweep interval', () => {
    const scheduler = new IntervalLivenessScheduler(
      loadEnvironment({ MQTT_LIVENESS_SWEEP_MS: '2500' }),
    );
    const task = vi.fn();
    scheduler.start(task);
    vi.advanceTimersByTime(2_499);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(task).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('does not register a duplicate interval when started repeatedly', () => {
    const scheduler = new IntervalLivenessScheduler(
      loadEnvironment({ MQTT_LIVENESS_SWEEP_MS: '1000' }),
    );
    const task = vi.fn();
    scheduler.start(task);
    scheduler.start(task);
    vi.advanceTimersByTime(2_000);
    expect(task).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('stops idempotently and prevents later sweeps', () => {
    const scheduler = new IntervalLivenessScheduler(
      loadEnvironment({ MQTT_LIVENESS_SWEEP_MS: '1000' }),
    );
    const task = vi.fn();
    scheduler.start(task);
    scheduler.stop();
    scheduler.stop();
    vi.advanceTimersByTime(5_000);
    expect(task).not.toHaveBeenCalled();
  });
});
