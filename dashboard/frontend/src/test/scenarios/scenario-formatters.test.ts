import {
  formatEventType,
  formatScenarioDuration,
  formatScenarioTimestamp,
} from '@/features/scenarios/scenario-formatters';

describe('scenario formatters', () => {
  it.each([
    [0, '0:00'],
    [500, '0:00'],
    [1_000, '0:01'],
    [5_000, '0:05'],
    [50_000, '0:50'],
    [60_000, '1:00'],
    [65_000, '1:05'],
  ])('formats %i milliseconds as %s', (value, expected) => {
    expect(formatScenarioDuration(value)).toBe(expected);
    expect(formatScenarioDuration(value)).toMatch(/^\d+:\d{2}$/);
  });

  it('uses the fixed scenario epoch for timestamps', () => {
    expect(formatScenarioTimestamp(0)).toBe('2026-06-15T20:30:00.000Z');
    expect(formatScenarioTimestamp(500)).toBe('2026-06-15T20:30:00.500Z');
    expect(formatScenarioTimestamp(1_000)).toBe('2026-06-15T20:30:01.000Z');
    expect(formatScenarioTimestamp(60_000)).toBe('2026-06-15T20:31:00.000Z');
  });

  it.each([
    ['SENSOR_ACTIVATED', 'Sensor Activated'],
    ['SET_NODE_ONLINE', 'Set Node Online'],
    ['SCENARIO_COMPLETED', 'Scenario Completed'],
  ])('formats %s for presentation', (value, expected) => {
    expect(formatEventType(value)).toBe(expected);
    expect(formatEventType(value)).not.toContain('_');
  });
});
