import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewAlert, OverviewSummary } from '@/features/overview/overview-model';

type AlertSummaryProps = Readonly<{
  alerts: readonly OverviewAlert[];
  summary: Pick<OverviewSummary, 'activeAlerts' | 'highestAlertSeverity'>;
}>;

export function AlertSummary({ alerts, summary }: AlertSummaryProps) {
  const visibleAlerts = alerts.slice(0, 3);

  return (
    <SectionCard
      title="Active alerts"
      description={`${summary.activeAlerts} active · Highest severity: ${summary.highestAlertSeverity}`}
      titleId="alert-summary-title"
      ariaLabel="Active alert summary"
      action={<StatusBadge label="Mock alerts" tone="neutral" />}
    >
      {visibleAlerts.length === 0 ? (
        <p className="inline-empty-state" role="status">
          No active alerts in this simulated snapshot.
        </p>
      ) : (
        <ul className="alert-list" aria-label="Active alert items">
          {visibleAlerts.map((alert) => (
            <li key={alert.id}>
              <div>
                <h3>{alert.title}</h3>
                <p>
                  {alert.entityReference} ·{' '}
                  <time dateTime={alert.timestamp}>{alert.timestampLabel}</time>
                </p>
              </div>
              <StatusBadge label={alert.severityLabel} tone={alert.severityTone} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
