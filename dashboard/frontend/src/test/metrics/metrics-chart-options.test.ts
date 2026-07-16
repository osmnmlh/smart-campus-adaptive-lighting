import { describe, expect, it } from 'vitest';
import { createMetricsDashboardModel } from '@/features/metrics/metrics-adapter';
import {
  buildAmbientLightChartOption,
  buildLampBrightnessChartOption,
  buildSensorActivityChartOption,
} from '@/features/metrics/metrics-chart-options';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';
import {
  ambientMetricSeries,
  lampMetricSeries,
  sensorActivityMetricSeries,
} from '@/features/metrics/metrics-selectors';

type OptionView = Readonly<{
  animation?: boolean;
  yAxis?: Readonly<{ min?: number; max?: number; name?: string; data?: readonly string[] }>;
  series?: readonly Readonly<{
    name?: string;
    type?: string;
    step?: string;
    data?: readonly (number | null)[];
  }>[];
}>;

const model = createMetricsDashboardModel(metricsTelemetryFixture);

describe('metrics chart options', () => {
  it('builds a non-animated three-series percentage chart', () => {
    const option = buildLampBrightnessChartOption(lampMetricSeries(model, 'lamp-2', '15m'));
    const view = option as OptionView;
    expect(view.animation).toBe(false);
    expect(view.series).toHaveLength(3);
    expect(view.yAxis?.min).toBe(0);
    expect(view.yAxis?.max).toBe(100);
    expect(view.yAxis?.name).toBe('%');
    expect(view.series?.[0]?.data).toContain(60);
    expect(view.series?.[0]?.data).toContain(100);
  });

  it('keeps canonical lamp metric series names and order', () => {
    const option = buildLampBrightnessChartOption(lampMetricSeries(model, 'lamp-3', '5m'));
    const names = (option as OptionView).series?.map((series) => series.name);
    expect(names).toEqual(['Brightness', 'Target Brightness', 'PWM Duty Percent (pwmDutyPercent)']);
    expect(names).not.toContain('pwmDuty');
  });

  it('uses lux and a non-negative axis for ambient light', () => {
    const option = buildAmbientLightChartOption(ambientMetricSeries(model, '15m'));
    const view = option as OptionView;
    expect(view.animation).toBe(false);
    expect(view.yAxis?.name).toBe('lx');
    expect(view.yAxis?.min).toBe(0);
    expect(view.series).toHaveLength(1);
  });

  it('uses a step line with Active and Inactive categories', () => {
    const option = buildSensorActivityChartOption(
      sensorActivityMetricSeries(model, 'sensor-ir-2', '15m'),
    );
    const view = option as OptionView;
    expect(view.animation).toBe(false);
    expect(view.yAxis?.data).toEqual(['Inactive', 'Active']);
    expect(view.series?.[0]?.step).toBe('end');
    expect(view.series?.[0]?.type).toBe('line');
  });

  it('omits invalid sensor points instead of silently correcting them', () => {
    const option = buildSensorActivityChartOption(
      sensorActivityMetricSeries(model, 'sensor-ir-2', '5m'),
    );
    const data = (option as OptionView).series?.[0]?.data;
    expect(data).toContain(null);
    expect(data?.filter((value) => value === null)).toHaveLength(1);
  });

  it('returns safe empty options', () => {
    expect(buildLampBrightnessChartOption([])).toBeNull();
    expect(buildSensorActivityChartOption(null)).toBeNull();
    expect(
      buildAmbientLightChartOption({
        key: 'ambientLight',
        label: 'Ambient Light',
        unit: 'LX',
        points: [],
      }),
    ).toBeNull();
  });

  it('does not mutate option-builder inputs', () => {
    const series = lampMetricSeries(model, 'lamp-1', '15m');
    const before = JSON.stringify(series);
    buildLampBrightnessChartOption(series);
    expect(JSON.stringify(series)).toBe(before);
  });

  it('produces deterministic semantic options', () => {
    const series = ambientMetricSeries(model, '60m');
    expect(JSON.stringify(buildAmbientLightChartOption(series))).toBe(
      JSON.stringify(buildAmbientLightChartOption(series)),
    );
  });
});
