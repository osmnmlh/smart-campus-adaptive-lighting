import {
  DataSource,
  MetricQuality,
  type EnergyLampBreakdown,
  type LampSnapshot,
  type UtcTimestamp,
} from '@smart-campus/contracts';

export type EnergyPowerCalculation = Readonly<{
  lamps: readonly EnergyLampBreakdown[];
  measuredLampCount: number;
  estimatedLampCount: number;
  currentActualPowerW: number;
  currentReferencePowerW: number;
  currentSavedPowerW: number;
  currentSavingsPercent: number;
  measurementCoveragePercent: number;
}>;

export type EnergyPowerCalculationInput = Readonly<{
  lamps: readonly LampSnapshot[];
  calculatedAt: UtcTimestamp;
  nominalLampPowerW: number;
  measurementStaleMs: number;
}>;

const DIRECTLY_MEASURED_LAMP_ID = 'lamp-3';

export function normalizeEnergyValue(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000) / 1_000;
}

function estimatedPower(nominalLampPowerW: number, brightnessPercent: number): number {
  return nominalLampPowerW * (brightnessPercent / 100);
}

function calculateLamp(
  lamp: LampSnapshot,
  calculatedAtMs: number,
  nominalLampPowerW: number,
  measurementStaleMs: number,
): EnergyLampBreakdown {
  const measurement = lamp.lampId === DIRECTLY_MEASURED_LAMP_ID ? lamp.electrical.power : null;
  const measurementAgeMs =
    measurement === null
      ? Number.POSITIVE_INFINITY
      : calculatedAtMs - Date.parse(measurement.observedAt);
  const measurementFresh =
    measurement !== null &&
    measurement.source === DataSource.MEASURED &&
    measurement.quality === MetricQuality.GOOD &&
    measurementAgeMs >= 0 &&
    measurementAgeMs <= measurementStaleMs;

  return {
    lampId: lamp.lampId,
    brightnessPercent: lamp.brightnessPercent,
    currentPowerW: normalizeEnergyValue(
      measurementFresh
        ? measurement.value
        : estimatedPower(nominalLampPowerW, lamp.brightnessPercent),
    ),
    dataSource: measurementFresh ? DataSource.MEASURED : DataSource.ESTIMATED,
    measurementFresh,
    ...(measurement === null ? {} : { measuredAt: measurement.observedAt }),
  };
}

export function calculateEnergyPower(input: EnergyPowerCalculationInput): EnergyPowerCalculation {
  const calculatedAtMs = Date.parse(input.calculatedAt);
  const lamps = [...input.lamps]
    .sort((left, right) => left.lampId.localeCompare(right.lampId))
    .map((lamp) =>
      calculateLamp(lamp, calculatedAtMs, input.nominalLampPowerW, input.measurementStaleMs),
    );
  const measuredLampCount = lamps.filter((lamp) => lamp.dataSource === DataSource.MEASURED).length;
  const estimatedLampCount = lamps.length - measuredLampCount;
  const currentActualPowerW = normalizeEnergyValue(
    lamps.reduce((total, lamp) => total + lamp.currentPowerW, 0),
  );
  const currentReferencePowerW = normalizeEnergyValue(input.nominalLampPowerW * lamps.length);
  const currentSavedPowerW = normalizeEnergyValue(
    Math.max(0, currentReferencePowerW - currentActualPowerW),
  );
  const currentSavingsPercent = normalizeEnergyValue(
    currentReferencePowerW > 0 ? (currentSavedPowerW / currentReferencePowerW) * 100 : 0,
  );

  return {
    lamps,
    measuredLampCount,
    estimatedLampCount,
    currentActualPowerW,
    currentReferencePowerW,
    currentSavedPowerW,
    currentSavingsPercent: Math.min(100, Math.max(0, currentSavingsPercent)),
    measurementCoveragePercent: normalizeEnergyValue(
      lamps.length > 0 ? (measuredLampCount / lamps.length) * 100 : 0,
    ),
  };
}
