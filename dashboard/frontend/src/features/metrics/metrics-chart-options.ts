import { MetricQuality } from '@smart-campus/contracts';
import type { DataSource, MetricUnit } from '@smart-campus/contracts';
import type {
  EChartsOption,
  LineSeriesOption,
  TooltipComponentFormatterCallbackParams,
} from 'echarts';
import type { MetricPoint, MetricSeries } from './metrics-model';
import {
  formatChartTimestamp,
  formatMetricTimestamp,
  formatMetricValue,
  metricUnitLabel,
} from './metrics-formatters';

const colors = ['#087c78', '#24445d', '#8a5200'];

type MetricChartDataItem = Readonly<{
  value: number | null;
  timestamp: string;
  unit: MetricUnit;
  source: DataSource;
  quality: MetricQuality;
}>;

function chartDataItem(point: MetricPoint): MetricChartDataItem {
  return {
    value: point.quality === MetricQuality.INVALID ? null : point.value,
    timestamp: point.timestamp,
    unit: point.unit,
    source: point.source,
    quality: point.quality,
  };
}

function isMetricChartDataItem(value: unknown): value is MetricChartDataItem {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    (typeof candidate.value === 'number' || candidate.value === null) &&
    typeof candidate.timestamp === 'string' &&
    typeof candidate.unit === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.quality === 'string'
  );
}

function plainTooltipText(value: string): string {
  return value.replace(/[<>&\r\n{}|]/g, ' ').trim();
}

function metricTooltipFormatter(params: TooltipComponentFormatterCallbackParams): string {
  const entries = Array.isArray(params) ? params : [params];
  const firstDataItem = entries.map((entry) => entry.data).find(isMetricChartDataItem);
  const lines = [
    `Timestamp: ${firstDataItem ? formatMetricTimestamp(firstDataItem.timestamp) : 'Not available'}`,
  ];

  entries.forEach((entry) => {
    const seriesName = plainTooltipText(entry.seriesName || 'Metric');
    if (!isMetricChartDataItem(entry.data)) {
      lines.push(`${seriesName}: Not available`);
      return;
    }

    const value =
      entry.data.value === null
        ? `Not available (${metricUnitLabel(entry.data.unit)})`
        : formatMetricValue(entry.data.value, entry.data.unit);
    lines.push(
      `${seriesName}: ${value}`,
      `Data source: ${plainTooltipText(entry.data.source)}`,
      `Metric quality: ${plainTooltipText(entry.data.quality)}`,
    );
  });

  return lines.join('\n');
}

function baseOption(title: string, description: string): EChartsOption {
  return {
    animation: false,
    color: colors,
    aria: { enabled: true, description },
    title: { text: title, left: 12, top: 8, textStyle: { fontSize: 14, color: '#071a2b' } },
    tooltip: { trigger: 'axis', renderMode: 'richText', formatter: metricTooltipFormatter },
    grid: { left: 54, right: 24, top: 72, bottom: 42, containLabel: false },
    textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: '#405463' },
  };
}

function lineSeries(series: MetricSeries): LineSeriesOption {
  const data: MetricChartDataItem[] = series.points.map(chartDataItem);
  return {
    name: series.label,
    type: 'line',
    showSymbol: false,
    smooth: false,
    connectNulls: false,
    data,
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
