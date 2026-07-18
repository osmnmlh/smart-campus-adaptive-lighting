import { formatActivityTimestamp } from '@/features/activity/activity-formatters';
import type { AlertSummary } from '@/features/alerts/alerts-model';

export function AlertsSummary({ summary }: Readonly<{ summary: AlertSummary }>) {
  const items = [
    ['Total alerts', summary.totalAlerts],
    ['Active', summary.activeAlerts],
    ['Resolved', summary.resolvedAlerts],
    ['Critical', summary.criticalAlerts],
    ['Warning', summary.warningAlerts],
    [
      'Latest timestamp',
      summary.latestAlertTimestamp === null
        ? 'None'
        : formatActivityTimestamp(summary.latestAlertTimestamp),
    ],
  ] as const;
  return (
    <section aria-labelledby="alerts-summary-title">
      <h2 id="alerts-summary-title" className="activity-section-title">
        Dataset summary
      </h2>
      <dl className="activity-summary-grid">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
