import { StatusBadge } from '@/components/ui/status-badge';
import { formatMetricTimestamp } from '@/features/metrics/metrics-formatters';

export function MetricsHeader({
  snapshotAt,
  live = false,
  sampleCount = 0,
}: Readonly<{ snapshotAt: string | null; live?: boolean; sampleCount?: number }>) {
  return (
    <header className="metrics-header">
      <div>
        <p className="eyebrow">{live ? 'Live session telemetry' : 'Deterministic telemetry'}</p>
        <h1>System Metrics</h1>
        <p>
          {live
            ? 'Current backend values and bounded history collected during this browser session.'
            : 'Fixed-window Apache ECharts views for simulated lamp, ambient-light, sensor, and quality metrics. This is not production telemetry evidence.'}
        </p>
      </div>
      <div className="metrics-header-meta">
        <StatusBadge
          label={live ? 'Live Session' : 'Simulated Data'}
          tone={live ? 'ready' : 'neutral'}
        />
        {live ? (
          <span>
            {sampleCount} session sample{sampleCount === 1 ? '' : 's'}
          </span>
        ) : null}
        {snapshotAt ? (
          <span>
            {live ? 'Latest update' : 'Fixture end'}:{' '}
            <time dateTime={snapshotAt}>{formatMetricTimestamp(snapshotAt)}</time>
          </span>
        ) : (
          <span>{live ? 'Session history unavailable' : 'Fixture end unavailable'}</span>
        )}
      </div>
    </header>
  );
}
