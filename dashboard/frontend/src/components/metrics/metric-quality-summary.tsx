import type { MetricQualitySummary } from '@/features/metrics/metrics-model';
import { formatMetricTimestamp } from '@/features/metrics/metrics-formatters';

export function MetricQualitySummaryPanel({
  summary,
}: Readonly<{ summary: MetricQualitySummary }>) {
  return (
    <section className="metrics-summary-card" aria-labelledby="metric-quality-title">
      <header>
        <p className="eyebrow">Source and quality</p>
        <h2 id="metric-quality-title">Metric quality summary</h2>
      </header>
      <dl className="metrics-quality-grid">
        <div data-quality="good">
          <dt>GOOD points</dt>
          <dd>{summary.good}</dd>
        </div>
        <div data-quality="stale">
          <dt>STALE points</dt>
          <dd>{summary.stale}</dd>
        </div>
        <div data-quality="invalid">
          <dt>INVALID points</dt>
          <dd>{summary.invalid}</dd>
        </div>
        <div>
          <dt>Data source</dt>
          <dd>{summary.source}</dd>
        </div>
        <div>
          <dt>Latest timestamp</dt>
          <dd>
            {summary.latestTimestamp
              ? formatMetricTimestamp(summary.latestTimestamp)
              : 'Not available'}
          </dd>
        </div>
      </dl>
      <p>
        STALE means an older observation; INVALID means the point failed quality validation and is
        not connected in charts. Values are never silently corrected.
      </p>
    </section>
  );
}
