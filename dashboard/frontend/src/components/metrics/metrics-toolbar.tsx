'use client';

import type { MetricsDashboardModel, TimeRange } from '@/features/metrics/metrics-model';
import { useLocalization } from '@/features/localization/use-localization';

type MetricsToolbarProps = Readonly<{
  model: MetricsDashboardModel;
  selectedLampId: string;
  selectedSensorId: string;
  timeRange: TimeRange;
  onLampChange: (value: string) => void;
  onSensorChange: (value: string) => void;
  onTimeRangeChange: (value: TimeRange) => void;
}>;

const ranges: readonly Readonly<{ value: TimeRange; label: string }>[] = [
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '60m', label: '60 min' },
];

export function MetricsToolbar({
  model,
  selectedLampId,
  selectedSensorId,
  timeRange,
  onLampChange,
  onSensorChange,
  onTimeRangeChange,
}: MetricsToolbarProps) {
  const { t } = useLocalization();
  return (
    <section className="metrics-toolbar" aria-label={t('metrics.filters')}>
      <label>
        <span>{t('metrics.lamp')}</span>
        <select value={selectedLampId} onChange={(event) => onLampChange(event.target.value)}>
          {model.lamps.map((lamp) => (
            <option key={lamp.lampId} value={lamp.lampId}>
              {lamp.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('metrics.irSensor')}</span>
        <select value={selectedSensorId} onChange={(event) => onSensorChange(event.target.value)}>
          {model.sensors.map((sensor) => (
            <option key={sensor.sensorId} value={sensor.sensorId}>
              {sensor.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>{t('metrics.fixedRange')}</legend>
        <div className="metrics-range-buttons">
          {ranges.map((range) => (
            <button
              key={range.value}
              type="button"
              aria-pressed={timeRange === range.value}
              onClick={() => onTimeRangeChange(range.value)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
