import { AlertTriangle, Bell, BellRing, CircleCheckBig, Clock3, OctagonAlert } from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { formatActivityTimestamp } from '@/features/activity/activity-formatters';
import type { AlertSummary } from '@/features/alerts/alerts-model';

export function AlertsSummary({ summary }: Readonly<{ summary: AlertSummary }>) {
  const iconProps = {
    size: 20,
    strokeWidth: 2.1,
    'aria-hidden': true,
    focusable: 'false',
  } as const;

  return (
    <section aria-labelledby="alerts-summary-title">
      <h2 id="alerts-summary-title" className="activity-section-title">
        Dataset summary
      </h2>
      <div className="alert-summary-grid">
        <SummaryCard
          label="Total alerts"
          value={summary.totalAlerts}
          detail="Full dataset"
          icon={<Bell {...iconProps} />}
        />
        <SummaryCard
          label="Active"
          value={summary.activeAlerts}
          detail="Open simulated alerts"
          tone={summary.activeAlerts > 0 ? 'warning' : 'ready'}
          icon={<BellRing {...iconProps} />}
        />
        <SummaryCard
          label="Resolved"
          value={summary.resolvedAlerts}
          detail="Closed records"
          tone="ready"
          icon={<CircleCheckBig {...iconProps} />}
        />
        <SummaryCard
          label="Critical"
          value={summary.criticalAlerts}
          detail="Critical severity records"
          tone={summary.criticalAlerts > 0 ? 'critical' : 'ready'}
          icon={<OctagonAlert {...iconProps} />}
        />
        <SummaryCard
          label="Warning"
          value={summary.warningAlerts}
          detail="Warning severity records"
          tone={summary.warningAlerts > 0 ? 'warning' : 'ready'}
          icon={<AlertTriangle {...iconProps} />}
        />
        <SummaryCard
          label="Latest timestamp"
          value={
            summary.latestAlertTimestamp === null
              ? 'None'
              : formatActivityTimestamp(summary.latestAlertTimestamp)
          }
          detail="Newest record"
          icon={<Clock3 {...iconProps} />}
        />
      </div>
    </section>
  );
}
