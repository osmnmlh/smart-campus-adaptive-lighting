'use client';

import { AlertTriangle, Bell, BellRing, CircleCheckBig, Clock3, OctagonAlert } from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/summary-card';
import type { AlertSummary } from '@/features/alerts/alerts-model';
import { useLocalization } from '@/features/localization/use-localization';

export function AlertsSummary({ summary }: Readonly<{ summary: AlertSummary }>) {
  const { t, formatDateTime } = useLocalization();
  const iconProps = {
    size: 20,
    strokeWidth: 2.1,
    'aria-hidden': true,
    focusable: 'false',
  } as const;

  return (
    <section aria-labelledby="alerts-summary-title">
      <h2 id="alerts-summary-title" className="activity-section-title">
        {t('alerts.datasetSummary')}
      </h2>
      <div className="alert-summary-grid">
        <SummaryCard
          label={t('alerts.total')}
          value={summary.totalAlerts}
          detail={t('alerts.fullDataset')}
          icon={<Bell {...iconProps} />}
        />
        <SummaryCard
          label={t('alerts.active')}
          value={summary.activeAlerts}
          detail={t('alerts.openSimulated')}
          tone={summary.activeAlerts > 0 ? 'warning' : 'ready'}
          icon={<BellRing {...iconProps} />}
        />
        <SummaryCard
          label={t('alerts.resolved')}
          value={summary.resolvedAlerts}
          detail={t('alerts.closedRecords')}
          tone="ready"
          icon={<CircleCheckBig {...iconProps} />}
        />
        <SummaryCard
          label={t('alerts.critical')}
          value={summary.criticalAlerts}
          detail={t('alerts.criticalRecords')}
          tone={summary.criticalAlerts > 0 ? 'critical' : 'ready'}
          icon={<OctagonAlert {...iconProps} />}
        />
        <SummaryCard
          label={t('alerts.warning')}
          value={summary.warningAlerts}
          detail={t('alerts.warningRecords')}
          tone={summary.warningAlerts > 0 ? 'warning' : 'ready'}
          icon={<AlertTriangle {...iconProps} />}
        />
        <SummaryCard
          label={t('alerts.latestTimestamp')}
          value={
            summary.latestAlertTimestamp === null
              ? t('common.none')
              : formatDateTime(summary.latestAlertTimestamp)
          }
          detail={t('alerts.newestRecord')}
          icon={<Clock3 {...iconProps} />}
        />
      </div>
    </section>
  );
}
