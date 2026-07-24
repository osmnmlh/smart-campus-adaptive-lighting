'use client';

import { MetricsDashboard } from '@/components/metrics/metrics-dashboard';
import { createMetricsDashboardState } from '@/features/metrics/metrics-adapter';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';
import { createLiveMetricsDashboardState } from '@/features/live-data/live-metrics-adapter';

export default function MetricsPage() {
  const state = useDashboardData();
  const live = state.configuredMode === 'live';
  return (
    <MetricsDashboard
      initialState={
        live
          ? createLiveMetricsDashboardState(state.snapshotHistory)
          : createMetricsDashboardState(metricsTelemetryFixture)
      }
      live={live}
    />
  );
}
