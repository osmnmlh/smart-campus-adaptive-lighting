import { formatActivityTimestamp } from '@/features/activity/activity-formatters';
import type { LogSummary } from '@/features/logs/logs-model';

export function LogsSummary({ summary }: Readonly<{ summary: LogSummary }>) {
  const items = [
    ['Total logs', summary.totalLogs],
    ['Info', summary.infoLogs],
    ['Warning', summary.warningLogs],
    ['Error', summary.errorLogs],
    [
      'Latest timestamp',
      summary.latestLogTimestamp === null
        ? 'None'
        : formatActivityTimestamp(summary.latestLogTimestamp),
    ],
  ] as const;

  return (
    <section aria-labelledby="logs-summary-title">
      <h2 id="logs-summary-title" className="activity-section-title">
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
