import { SummaryCard } from './summary-card';
import { SystemModeCard } from './system-mode-card';
import type { OverviewModel } from '@/features/overview/overview-model';

type SummaryGridProps = Readonly<{
  model: OverviewModel;
}>;

export function SummaryGrid({ model }: SummaryGridProps) {
  const { summary } = model;

  return (
    <section className="summary-section" aria-labelledby="summary-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">System overview</p>
          <h2 id="summary-title">Operational summary</h2>
        </div>
      </div>
      <div className="summary-grid">
        <SummaryCard
          label="Nodes"
          value={summary.totalNodes}
          detail={`${summary.onlineNodes} online`}
          statusLabel={
            summary.offlineNodes === 0 ? 'All connected' : `${summary.offlineNodes} offline`
          }
          tone={summary.offlineNodes === 0 ? 'ready' : 'warning'}
        />
        <SummaryCard
          label="Lamps"
          value={summary.totalLamps}
          detail={`${summary.activeLamps} active · ${summary.preLightLamps} pre-light`}
          statusLabel="Simulated"
          tone="neutral"
        />
        <SummaryCard
          label="Active Alerts"
          value={summary.activeAlerts}
          detail={`Highest: ${summary.highestAlertSeverity}`}
          statusLabel="Mock alert"
          tone={summary.activeAlerts > 0 ? 'warning' : 'ready'}
        />
        <SystemModeCard model={model} />
        <SummaryCard
          label="Data Source"
          value={model.dataSource}
          detail={`${model.dataSourceLabel} fixture`}
          statusLabel="Not live"
          tone="neutral"
        />
      </div>
    </section>
  );
}
