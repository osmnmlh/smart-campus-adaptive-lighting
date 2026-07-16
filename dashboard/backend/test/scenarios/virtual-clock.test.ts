import { VirtualClock } from '../../src/scenarios/domain/virtual-clock.js';

const epoch = '2026-01-01T00:00:00.000Z';

describe('VirtualClock', () => {
  it('uses an explicit initial scenario-relative time', () => {
    expect(new VirtualClock(epoch, 250).nowMs()).toBe(250);
  });

  it('advances by non-negative integer milliseconds', () => {
    const clock = new VirtualClock(epoch);
    expect(clock.advanceBy(1_500)).toBe(1_500);
    expect(clock.advanceBy(0)).toBe(1_500);
  });

  it('rejects a negative advance', () => {
    expect(() => new VirtualClock(epoch).advanceBy(-1)).toThrow('non-negative integer');
  });

  it('rejects moving backwards with advanceTo', () => {
    const clock = new VirtualClock(epoch, 100);
    expect(() => clock.advanceTo(99)).toThrow('cannot move backwards');
  });

  it('renders deterministic UTC ISO timestamps from virtual time', () => {
    const clock = new VirtualClock(epoch);
    clock.advanceTo(1_234);
    expect(clock.toIsoTimestamp()).toBe('2026-01-01T00:00:01.234Z');
  });

  it('is independent from the system clock', () => {
    const first = new VirtualClock(epoch, 5_000);
    const second = new VirtualClock(epoch, 5_000);
    expect(first.toIsoTimestamp()).toBe(second.toIsoTimestamp());
  });
});
