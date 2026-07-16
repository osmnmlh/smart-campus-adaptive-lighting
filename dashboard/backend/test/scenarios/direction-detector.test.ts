import { Direction } from '@smart-campus/contracts';

import {
  createDirectionDetectorState,
  detectDirection,
} from '../../src/scenarios/domain/direction-detector.js';

describe('direction detector', () => {
  it('detects IR1 then IR2 as LEFT_TO_RIGHT', () => {
    const entry = detectDirection(createDirectionDetectorState(), 'sensor-ir-1', 1_000);
    const confirmation = detectDirection(entry.state, 'sensor-ir-2', 2_000);
    expect(confirmation.direction).toBe(Direction.LEFT_TO_RIGHT);
  });

  it('detects IR5 then IR4 as RIGHT_TO_LEFT', () => {
    const entry = detectDirection(createDirectionDetectorState(), 'sensor-ir-5', 1_000);
    const confirmation = detectDirection(entry.state, 'sensor-ir-4', 2_000);
    expect(confirmation.direction).toBe(Direction.RIGHT_TO_LEFT);
  });

  it('does not infer direction from IR3', () => {
    expect(
      detectDirection(createDirectionDetectorState(), 'sensor-ir-3', 1_000).direction,
    ).toBeNull();
  });

  it('does not infer direction from a single entry sensor', () => {
    expect(
      detectDirection(createDirectionDetectorState(), 'sensor-ir-1', 1_000).direction,
    ).toBeNull();
  });

  it('does not confirm after the correlation timeout', () => {
    const entry = detectDirection(createDirectionDetectorState(), 'sensor-ir-1', 1_000);
    expect(detectDirection(entry.state, 'sensor-ir-2', 4_001).direction).toBeNull();
  });

  it('does not confirm events in the wrong order', () => {
    const wrongFirst = detectDirection(createDirectionDetectorState(), 'sensor-ir-2', 1_000);
    expect(detectDirection(wrongFirst.state, 'sensor-ir-1', 2_000).direction).toBeNull();
  });

  it('returns deterministic confirmation sensor IDs', () => {
    const entry = detectDirection(createDirectionDetectorState(), 'sensor-ir-5', 10);
    expect(detectDirection(entry.state, 'sensor-ir-4', 20).confirmedBySensorIds).toEqual([
      'sensor-ir-5',
      'sensor-ir-4',
    ]);
  });
});
