import { ScenarioValidationError } from './scenario-errors.js';

const assertNonNegativeInteger = (value: number, label: string): void => {
  if (!Number.isInteger(value) || value < 0) {
    throw new ScenarioValidationError(`${label} must be a non-negative integer`);
  }
};

/** Scenario-relative milliseconds rendered against an explicit, fixed UTC epoch. */
export class VirtualClock {
  private readonly epochMs: number;

  private elapsedMs: number;

  constructor(epochUtc: string, initialMs = 0) {
    const parsedEpochMs = Date.parse(epochUtc);

    if (!Number.isFinite(parsedEpochMs)) {
      throw new ScenarioValidationError('epochUtc must be a valid UTC timestamp');
    }

    assertNonNegativeInteger(initialMs, 'initialMs');
    this.epochMs = parsedEpochMs;
    this.elapsedMs = initialMs;
  }

  nowMs(): number {
    return this.elapsedMs;
  }

  advanceBy(ms: number): number {
    assertNonNegativeInteger(ms, 'advanceBy ms');
    this.elapsedMs += ms;
    return this.elapsedMs;
  }

  advanceTo(ms: number): number {
    assertNonNegativeInteger(ms, 'advanceTo ms');

    if (ms < this.elapsedMs) {
      throw new ScenarioValidationError('Virtual clock cannot move backwards');
    }

    this.elapsedMs = ms;
    return this.elapsedMs;
  }

  toIsoTimestamp(): string {
    return new Date(this.epochMs + this.elapsedMs).toISOString();
  }
}
