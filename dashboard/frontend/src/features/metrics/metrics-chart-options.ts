import { MetricQuality } from '@smart-campus/contracts';
import type { EChartsOption, LineSeriesOption } from 'echarts';
import type { MetricSeries } from './metrics-model';
import { formatChartTimestamp } from './metrics-formatters';

const colors = ['#087c78', '#24445d', '#8a5200'];

function baseOption(title: string, description: string): EChartsOption {
  return {
    animation: false,
    color: colors,
    aria: { enabled: true, description },
    title: { text: title, left: 12, top: 8, textStyle: { fontSize: 14, color: '#071a2b' } },
    tooltip: { trigger: 'axis' },
    grid: { left: 54, right: 24, top: 72, bottom: 42, containLabel: false },
    textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: '#405463' },
  };
}

function lineSeries(series: MetricSeries): LineSeriesOption {
  return {
    name: series.label,
    type: 'line',
    showSymbol: false,
    smooth: false,
    connectNulls: false,
    data: series.points.map((point) =>
      point.quality === MetricQuality.INVALID ? null : point.value,
    ),
  };
}

export function buildLampBrightnessChartOption(
  series: readonly MetricSeries[],
): EChartsOption | null {
  const points = series[0]?.points ?? [];
  if (series.length === 0 || points.length === 0) return null;
  return {
    ...baseOption(
      'Lamp output metrics',
      'Brightness, target brightness, and PWM duty percent from simulated telemetry.',
    ),
    legend: { top: 36, left: 12 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((point) => formatChartTimestamp(point.timestamp)),
    },
    yAxis: { type: 'value', min: 0, max: 100, name: '%' },
    series: series.map(lineSeries),
  };
}

export function buildAmbientLightChartOption(series: MetricSeries): EChartsOption | null {
  if (series.points.length === 0) return null;
  return {
    ...baseOption(
      'Ambient light',
      'BH1750 ambient illuminance in lux from deterministic simulated telemetry.',
    ),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: series.points.map((point) => formatChartTimestamp(point.timestamp)),
    },
    yAxis: { type: 'value', min: 0, name: 'lx' },
    series: [
      {
        ...lineSeries(series),
        areaStyle: { opacity: 0.08 },
      },
    ],
  };
}

export function buildSensorActivityChartOption(series: MetricSeries | null): EChartsOption | null {
  if (!series || series.points.length === 0) return null;
  return {
    ...baseOption(
      'Sensor activity',
      'Infrared motion activity states where zero is inactive and one is active.',
    ),
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: series.points.map((point) => formatChartTimestamp(point.timestamp)),
    },
    yAxis: { type: 'category', data: ['Inactive', 'Active'] },
    series: [
      {
        ...lineSeries(series),
        step: 'end',
      },
    ],
  };
}
