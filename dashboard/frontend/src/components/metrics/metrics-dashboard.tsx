'use client';

import { useMemo, useState } from 'react';
import { AmbientLightChart } from './ambient-light-chart';
import { CommunicationStatusSummary } from './communication-status-summary';
import { LampBrightnessChart } from './lamp-brightness-chart';
import { MetricQualitySummaryPanel } from './metric-quality-summary';
import { MetricsDataTable } from './metrics-data-table';
import { MetricsEmptyState } from './metrics-empty-state';
import { MetricsHeader } from './metrics-header';
import { MetricsToolbar } from './metrics-toolbar';
import { SensorActivityChart } from './sensor-activity-chart';
import { EnergyAnalyticsSection } from './energy-analytics-section';
import type { EnergyAnalyticsSummary } from '@smart-campus/contracts';
import type { MetricsDashboardState, TimeRange } from '@/features/metrics/metrics-model';
import {
  ambientMetricSeries,
  lampMetricSeries,
  metricQualitySummary,
  metricsTableRows,
  nodeCommunicationStatuses,
  selectedMetricPoints,
  sensorActivityMetricSeries,
} from '@/features/metrics/metrics-selectors';

export function MetricsDashboard({
  initialState,
  energySummary,
  live = false,
}: Readonly<{
  initialState: MetricsDashboardState;
  energySummary?: EnergyAnalyticsSummary | null;
  live?: boolean;
}>) {
  const [selectedLampId, setSelectedLampId] = useState('lamp-2');
  const [selectedSensorId, setSelectedSensorId] = useState('sensor-ir-2');
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');
  const model = initialState.model;

  const selection = useMemo(() => {
    if (!model) return null;
    const lamps = lampMetricSeries(model, selectedLampId, timeRange);
    const ambient = ambientMetricSeries(model, timeRange);
    const sensor = sensorActivityMetricSeries(model, selectedSensorId, timeRange);
    const points = selectedMetricPoints(lamps, ambient, sensor);
    return {
      lamps,
      ambient,
      sensor,
      quality: metricQualitySummary(points),
      rows: metricsTableRows(lamps, ambient, sensor),
    };
  }, [model, selectedLampId, selectedSensorId, timeRange]);

  return (
    <div className="metrics-dashboard">
      <MetricsHeader
        snapshotAt={model?.fixtureEnd ?? null}
        live={live}
        sampleCount={model?.lamps[0]?.points.length ?? 0}
      />
      {initialState.status !== 'ready' || !model || !selection ? (
        <MetricsEmptyState
          title={
            initialState.status === 'empty' ? 'No metric series available' : 'Metrics unavailable'
          }
          message={initialState.message}
        />
      ) : (
        <>
          <MetricsToolbar
            model={model}
            selectedLampId={selectedLampId}
            selectedSensorId={selectedSensorId}
            timeRange={timeRange}
            onLampChange={setSelectedLampId}
            onSensorChange={setSelectedSensorId}
            onTimeRangeChange={setTimeRange}
          />

          <div className="metrics-chart-grid">
            <LampBrightnessChart
              lampLabel={
                model.lamps.find((lamp) => lamp.lampId === selectedLampId)?.label ?? selectedLampId
              }
              series={selection.lamps}
            />
            <AmbientLightChart series={selection.ambient} />
            <SensorActivityChart
              sensorLabel={
                model.sensors.find((sensor) => sensor.sensorId === selectedSensorId)?.label ??
                selectedSensorId
              }
              series={selection.sensor}
            />
          </div>

          <div className="metrics-summary-grid">
            <MetricQualitySummaryPanel summary={selection.quality} />
            <CommunicationStatusSummary items={nodeCommunicationStatuses(model)} />
          </div>

          <EnergyAnalyticsSection summary={energySummary ?? null} live={live} />

          <MetricsDataTable
            rows={selection.rows}
            caption={`${selectedLampId}, ${selectedSensorId}, ${timeRange} ${
              live ? 'live session' : 'simulated'
            } metric points; newest rows first.`}
          />
        </>
      )}
    </div>
  );
}
