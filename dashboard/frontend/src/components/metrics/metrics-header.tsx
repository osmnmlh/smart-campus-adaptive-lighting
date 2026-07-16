import { StatusBadge } from '@/components/ui/status-badge';
import { formatMetricTimestamp } from '@/features/metrics/metrics-formatters';

export function MetricsHeader({ snapshotAt }: Readonly<{ snapshotAt: string | null }>) {
  return (
    <header className="metrics-header">
      <div>
        <p className="eyebrow">Deterministic telemetry</p>
        <h1>System Metrics</h1>
        <p>
          Fixed-window Apache ECharts views for simulated lamp, ambient-light, sensor, and quality
          metrics. This is not production telemetry evidence.
        </p>
      </div>
      <div className="metrics-header-meta">
        <StatusBadge label="Simulated Data" tone="neutral" />
        {snapshotAt ? (
          <span>
            Fixture end: <time dateTime={snapshotAt}>{formatMetricTimestamp(snapshotAt)}</time>
          </span>
        ) : (
          <span>Fixture end unavailable</span>
        )}
      </div>
    </header>
  );
}
