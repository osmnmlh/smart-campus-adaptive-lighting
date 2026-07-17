import type { MetricsTableRow } from '@/features/metrics/metrics-model';
import {
  formatMetricTimestamp,
  formatMetricValue,
  metricUnitLabel,
} from '@/features/metrics/metrics-formatters';

type MetricsDataTableProps = Readonly<{
  rows: readonly MetricsTableRow[];
  caption: string;
}>;

export function MetricsDataTable({ rows, caption }: MetricsDataTableProps) {
  if (rows.length === 0) {
    return (
      <section className="metrics-data-section" aria-labelledby="metrics-table-title">
        <h2 id="metrics-table-title">Accessible metric data</h2>
        <p className="metrics-table-empty">No metric rows are available for this selection.</p>
      </section>
    );
  }

  return (
    <section className="metrics-data-section" aria-labelledby="metrics-table-title">
      <header>
        <p className="eyebrow">Accessible alternative</p>
        <h2 id="metrics-table-title">Metric data table</h2>
        <p>Visible tabular values synchronized with the selected lamp, sensor, and time range.</p>
      </header>
      <div className="metrics-table-scroll" tabIndex={0} aria-label="Scrollable metric data table">
        <table className="metrics-data-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Timestamp</th>
              <th scope="col">Metric</th>
              <th scope="col">Value</th>
              <th scope="col">Unit</th>
              <th scope="col">Data source</th>
              <th scope="col">Metric quality</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-quality={row.quality.toLowerCase()}>
                <td>
                  <time dateTime={row.timestamp}>{formatMetricTimestamp(row.timestamp)}</time>
                </td>
                <th scope="row">{row.metric}</th>
                <td>{formatMetricValue(row.value, row.unit)}</td>
                <td>{metricUnitLabel(row.unit)}</td>
                <td>{row.source}</td>
                <td>{row.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
