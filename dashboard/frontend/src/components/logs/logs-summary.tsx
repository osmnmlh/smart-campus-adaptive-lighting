'use client';

import type { LogSummary } from '@/features/logs/logs-model';
import { useLocalization } from '@/features/localization/use-localization';

export function LogsSummary({ summary }: Readonly<{ summary: LogSummary }>) {
  const { t, formatDateTime } = useLocalization();
  const items = [
    [t('logs.total'), summary.totalLogs],
    [t('logs.info'), summary.infoLogs],
    [t('logs.warning'), summary.warningLogs],
    [t('logs.error'), summary.errorLogs],
    [
      t('logs.latestTimestamp'),
      summary.latestLogTimestamp === null
        ? t('common.none')
        : formatDateTime(summary.latestLogTimestamp),
    ],
  ] as const;

  return (
    <section aria-labelledby="logs-summary-title">
      <h2 id="logs-summary-title" className="activity-section-title">
        {t('logs.datasetSummary')}
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
