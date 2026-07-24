'use client';

import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewAlert, OverviewSummary } from '@/features/overview/overview-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type AlertSummaryProps = Readonly<{
  alerts: readonly OverviewAlert[];
  summary: Pick<OverviewSummary, 'activeAlerts' | 'highestAlertSeverity'>;
}>;

export function AlertSummary({ alerts, summary }: AlertSummaryProps) {
  const { locale, t, formatDateTime } = useLocalization();
  const visibleAlerts = alerts.slice(0, 3);

  return (
    <SectionCard
      title={t('overview.activeAlerts')}
      description={t('overview.activeHighest', {
        count: summary.activeAlerts,
        severity:
          summary.highestAlertSeverity === 'NONE'
            ? t('common.none')
            : displayEnumLabel(locale, summary.highestAlertSeverity),
      })}
      titleId="alert-summary-title"
      ariaLabel={t('overview.activeAlertSummary')}
      action={<StatusBadge label={t('overview.mockAlerts')} tone="neutral" />}
    >
      {visibleAlerts.length === 0 ? (
        <p className="inline-empty-state" role="status">
          {t('overview.noActiveAlerts')}
        </p>
      ) : (
        <ul className="alert-list" aria-label={t('overview.activeAlertItems')}>
          {visibleAlerts.map((alert) => (
            <li key={alert.id}>
              <div>
                <h3>{alert.title}</h3>
                <p>
                  {alert.entityReference} ·{' '}
                  <time dateTime={alert.timestamp}>{formatDateTime(alert.timestamp)}</time>
                </p>
              </div>
              <StatusBadge
                label={displayEnumLabel(locale, alert.severity)}
                tone={alert.severityTone}
              />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
