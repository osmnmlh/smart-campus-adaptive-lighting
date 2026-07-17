import { MetricsDashboard } from '@/components/metrics/metrics-dashboard';
import { createMetricsDashboardState } from '@/features/metrics/metrics-adapter';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';

const metricsState = createMetricsDashboardState(metricsTelemetryFixture);

export default function MetricsPage() {
  return <MetricsDashboard initialState={metricsState} />;
}
