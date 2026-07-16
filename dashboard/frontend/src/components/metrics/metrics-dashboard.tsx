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
}: Readonly<{ initialState: MetricsDashboardState }>) {
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
      <MetricsHeader snapshotAt={model?.fixtureEnd ?? null} />
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

          <section className="metrics-electrical-state" aria-labelledby="electrical-state-title">
            <p className="eyebrow">Unavailable metric family</p>
            <h2 id="electrical-state-title">Electrical metrics not available</h2>
            <p>
              INA219 current, voltage, and power data are not provided in this simulated fixture. No
              electrical, savings, cost, or carbon values are inferred.
            </p>
          </section>

          <MetricsDataTable
            rows={selection.rows}
            caption={`${selectedLampId}, ${selectedSensorId}, ${timeRange} simulated metric points; newest rows first.`}
          />
        </>
      )}
    </div>
  );
}
