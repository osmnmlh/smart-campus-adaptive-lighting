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
  tooltip?: Readonly<{
    renderMode?: string;
    formatter?: (params: unknown) => string;
  }>;
  series?: readonly Readonly<{
    name?: string;
    type?: string;
    step?: string;
    data?: readonly Readonly<{
      value?: number | null;
      timestamp?: string;
      unit?: string;
      source?: string;
      quality?: string;
    }>[];
  }>[];
}>;

const model = createMetricsDashboardModel(metricsTelemetryFixture);

function optionView(option: unknown): OptionView {
  return option as OptionView;
}

function formatTooltip(option: unknown, params: unknown): string {
  const formatter = optionView(option).tooltip?.formatter;
  expect(formatter).toBeTypeOf('function');
  return formatter?.(params) ?? '';
}

describe('metrics chart options', () => {
  it('builds a non-animated three-series percentage chart', () => {
    const option = buildLampBrightnessChartOption(lampMetricSeries(model, 'lamp-2', '15m'));
    const view = optionView(option);
    expect(view.animation).toBe(false);
    expect(view.series).toHaveLength(3);
    expect(view.yAxis?.min).toBe(0);
    expect(view.yAxis?.max).toBe(100);
    expect(view.yAxis?.name).toBe('%');
    expect(view.series?.[0]?.data?.map((item) => item.value)).toContain(60);
    expect(view.series?.[0]?.data?.map((item) => item.value)).toContain(100);
  });

  it('keeps canonical lamp metric series names and order', () => {
    const option = buildLampBrightnessChartOption(lampMetricSeries(model, 'lamp-3', '5m'));
    const names = optionView(option).series?.map((series) => series.name);
    expect(names).toEqual(['Brightness', 'Target Brightness', 'PWM Duty Percent (pwmDutyPercent)']);
    expect(names).not.toContain('pwmDuty');
  });

  it('uses lux and a non-negative axis for ambient light', () => {
    const option = buildAmbientLightChartOption(ambientMetricSeries(model, '15m'));
    const view = optionView(option);
    expect(view.animation).toBe(false);
    expect(view.yAxis?.name).toBe('lx');
    expect(view.yAxis?.min).toBe(0);
    expect(view.series).toHaveLength(1);
  });

  it('uses a step line with Active and Inactive categories', () => {
    const option = buildSensorActivityChartOption(
      sensorActivityMetricSeries(model, 'sensor-ir-2', '15m'),
    );
    const view = optionView(option);
    expect(view.animation).toBe(false);
    expect(view.yAxis?.data).toEqual(['Inactive', 'Active']);
    expect(view.series?.[0]?.step).toBe('end');
    expect(view.series?.[0]?.type).toBe('line');
  });

  it('omits invalid sensor points instead of silently correcting them', () => {
    const option = buildSensorActivityChartOption(
      sensorActivityMetricSeries(model, 'sensor-ir-2', '5m'),
    );
    const data = optionView(option).series?.[0]?.data;
    expect(data?.map((item) => item.value)).toContain(null);
    expect(data?.filter((item) => item.value === null)).toHaveLength(1);
    expect(data?.find((item) => item.value === null)?.quality).toBe('INVALID');
  });

  it('carries source, quality, timestamp, and unit metadata in every chart data item', () => {
    const lampOption = buildLampBrightnessChartOption(lampMetricSeries(model, 'lamp-2', '5m'));
    const ambientOption = buildAmbientLightChartOption(ambientMetricSeries(model, '5m'));
    const sensorOption = buildSensorActivityChartOption(
      sensorActivityMetricSeries(model, 'sensor-ir-2', '5m'),
    );
    const dataItems = [
      ...(optionView(lampOption).series?.flatMap((series) => series.data ?? []) ?? []),
      ...(optionView(ambientOption).series?.flatMap((series) => series.data ?? []) ?? []),
      ...(optionView(sensorOption).series?.flatMap((series) => series.data ?? []) ?? []),
    ];

    expect(dataItems.length).toBeGreaterThan(0);
    expect(dataItems.every((item) => item.source === 'SIMULATED')).toBe(true);
    expect(dataItems.every((item) => typeof item.timestamp === 'string')).toBe(true);
    expect(dataItems.every((item) => typeof item.unit === 'string')).toBe(true);
    expect(dataItems.some((item) => item.quality === 'GOOD')).toBe(true);
    expect(dataItems.some((item) => item.quality === 'STALE')).toBe(true);
    expect(dataItems.some((item) => item.quality === 'INVALID')).toBe(true);
  });

  it('formats lamp and ambient tooltips with units, source, GOOD, and STALE quality', () => {
    const lampOption = buildLampBrightnessChartOption(lampMetricSeries(model, 'lamp-2', '5m'));
    const lampData = optionView(lampOption).series?.[0]?.data ?? [];
    const goodTooltip = formatTooltip(lampOption, [
      { seriesName: 'Brightness', data: lampData[0] },
    ]);
    const staleTooltip = formatTooltip(lampOption, [
      { seriesName: 'Brightness', data: lampData[1] },
    ]);
    const ambientOption = buildAmbientLightChartOption(ambientMetricSeries(model, '5m'));
    const ambientData = optionView(ambientOption).series?.[0]?.data ?? [];
    const ambientTooltip = formatTooltip(ambientOption, [
      { seriesName: 'Ambient Light', data: ambientData[2] },
    ]);

    expect(optionView(lampOption).tooltip?.renderMode).toBe('richText');
    expect(goodTooltip).toContain('Timestamp: 2026-06-15');
    expect(goodTooltip).toContain('Brightness: 100%');
    expect(goodTooltip).toContain('Data source: SIMULATED');
    expect(goodTooltip).toContain('Metric quality: GOOD');
    expect(staleTooltip).toContain('Metric quality: STALE');
    expect(ambientTooltip).toContain('Ambient Light:');
    expect(ambientTooltip).toContain('lx');
    expect(ambientTooltip).toContain('Metric quality: STALE');
  });

  it('formats sensor activity and invalid null values safely', () => {
    const option = buildSensorActivityChartOption(
      sensorActivityMetricSeries(model, 'sensor-ir-2', '5m'),
    );
    const data = optionView(option).series?.[0]?.data ?? [];
    const activeTooltip = formatTooltip(option, [{ seriesName: 'IR2 Activity', data: data[0] }]);
    const invalidTooltip = formatTooltip(option, [
      { seriesName: 'IR2 Activity', data: data.find((item) => item.quality === 'INVALID') },
    ]);

    expect(activeTooltip).toContain('IR2 Activity: Active');
    expect(activeTooltip).toContain('Data source: SIMULATED');
    expect(invalidTooltip).toContain('Not available (Active state)');
    expect(invalidTooltip).toContain('Metric quality: INVALID');

    const untrustedLabelTooltip = formatTooltip(option, [
      { seriesName: '<script>alert(1)</script>', data: data[0] },
    ]);
    expect(untrustedLabelTooltip).not.toContain('<script');
    expect(untrustedLabelTooltip).not.toContain('</script>');
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
