import {
  DataSource,
  MetricQuality,
  type LampSnapshot,
  type PowerMetricValue,
} from '@smart-campus/contracts';

import { calculateEnergyPower } from '../../src/modules/energy/domain/energy-calculator.js';

const calculatedAt = '2026-07-24T08:00:15.000Z';

function measuredPower(
  value: number,
  observedAt = '2026-07-24T08:00:10.000Z',
  quality = MetricQuality.GOOD,
): PowerMetricValue {
  return { value, unit: 'W', source: DataSource.MEASURED, observedAt, quality };
}

function lamp(
  lampNumber: number,
  brightnessPercent: number,
  power: PowerMetricValue | null = null,
): LampSnapshot {
  return {
    lampId: `lamp-${lampNumber}`,
    operatingState: brightnessPercent === 0 ? 'OFF' : 'ACTIVE',
    health: 'HEALTHY',
    brightnessPercent,
    targetBrightnessPercent: brightnessPercent,
    pwmDutyPercent: brightnessPercent,
    electrical: {
      current: null,
      voltage: null,
      power,
      energy: {
        value: 0,
        unit: 'Wh',
        source: power?.source ?? DataSource.ESTIMATED,
        observedAt: power?.observedAt ?? calculatedAt,
        quality: power?.quality ?? MetricQuality.GOOD,
      },
    },
    fadeRemainingMs: 0,
    updatedAt: calculatedAt,
  };
}

function calculate(lamps: readonly LampSnapshot[]) {
  return calculateEnergyPower({
    lamps,
    calculatedAt,
    nominalLampPowerW: 10,
    measurementStaleMs: 15_000,
  });
}

describe('calculateEnergyPower', () => {
  it.each([
    [0, 0],
    [30, 3],
    [60, 6],
    [100, 10],
  ])('estimates %s%% brightness as %s W', (brightnessPercent, expectedPower) => {
    expect(calculate([lamp(1, brightnessPercent)]).lamps[0]?.currentPowerW).toBe(expectedPower);
  });

  it('uses a fresh L3 INA219 measurement', () => {
    const result = calculate([lamp(3, 30, measuredPower(4.25))]);
    expect(result.lamps[0]).toMatchObject({
      currentPowerW: 4.25,
      dataSource: DataSource.MEASURED,
      measurementFresh: true,
    });
  });

  it('falls back to an estimate for stale L3 power', () => {
    const result = calculate([lamp(3, 60, measuredPower(9, '2026-07-24T07:59:59.999Z'))]);
    expect(result.lamps[0]).toMatchObject({
      currentPowerW: 6,
      dataSource: DataSource.ESTIMATED,
      measurementFresh: false,
    });
  });

  it('falls back to an estimate when L3 power is missing', () => {
    expect(calculate([lamp(3, 30)]).lamps[0]).toMatchObject({
      currentPowerW: 3,
      dataSource: DataSource.ESTIMATED,
    });
  });

  it('never attributes another lamp measurement as MEASURED', () => {
    expect(calculate([lamp(1, 30, measuredPower(8))]).lamps[0]).toMatchObject({
      currentPowerW: 3,
      dataSource: DataSource.ESTIMATED,
    });
  });

  it('retains measured power above nominal and prevents negative savings', () => {
    const result = calculate([
      lamp(1, 0),
      lamp(2, 0),
      lamp(3, 100, measuredPower(60)),
      lamp(4, 0),
      lamp(5, 0),
    ]);
    expect(result.currentActualPowerW).toBe(60);
    expect(result.currentSavedPowerW).toBe(0);
    expect(result.currentSavingsPercent).toBe(0);
  });

  it('calculates the five-lamp reference and total', () => {
    const result = calculate([lamp(1, 30), lamp(2, 30), lamp(3, 60), lamp(4, 30), lamp(5, 30)]);
    expect(result.currentActualPowerW).toBe(18);
    expect(result.currentReferencePowerW).toBe(50);
    expect(result.currentSavedPowerW).toBe(32);
    expect(result.currentSavingsPercent).toBe(64);
  });

  it('reports 1/5 measurement coverage for fresh L3', () => {
    const result = calculate([
      lamp(1, 30),
      lamp(2, 30),
      lamp(3, 60, measuredPower(6)),
      lamp(4, 30),
      lamp(5, 30),
    ]);
    expect(result.measuredLampCount).toBe(1);
    expect(result.estimatedLampCount).toBe(4);
    expect(result.measurementCoveragePercent).toBe(20);
  });

  it('reports zero coverage when L3 is stale', () => {
    const result = calculate([
      lamp(1, 30),
      lamp(2, 30),
      lamp(3, 60, measuredPower(6, '2026-07-24T07:59:00.000Z')),
      lamp(4, 30),
      lamp(5, 30),
    ]);
    expect(result.measuredLampCount).toBe(0);
    expect(result.measurementCoveragePercent).toBe(0);
  });

  it('does not mutate or reorder the input', () => {
    const input = [lamp(5, 30), lamp(1, 60)];
    const before = structuredClone(input);
    expect(calculate(input).lamps.map((item) => item.lampId)).toEqual(['lamp-1', 'lamp-5']);
    expect(input).toEqual(before);
  });
});
