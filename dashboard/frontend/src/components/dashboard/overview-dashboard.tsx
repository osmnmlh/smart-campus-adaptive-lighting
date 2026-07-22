import { AlertSummary } from './alert-summary';
import { DataSourceNotice } from './data-source-notice';
import { LampStatusSummary } from './lamp-status-summary';
import { NodeStatusList } from './node-status-list';
import { OverviewEmptyState } from './overview-empty-state';
import { OverviewHeader } from './overview-header';
import { SensorStatusSummary } from './sensor-status-summary';
import { SummaryGrid } from './summary-grid';
import type { OverviewModel } from '@/features/overview/overview-model';

type OverviewDashboardProps = Readonly<{
  model: OverviewModel | null;
  errorMessage?: string | null;
}>;

export function OverviewDashboard({ model, errorMessage = null }: OverviewDashboardProps) {
  if (errorMessage) {
    return <OverviewEmptyState variant="error" message={errorMessage} />;
  }

  if (!model) {
    return <OverviewEmptyState />;
  }

  return (
    <div className="overview-dashboard">
      <OverviewHeader model={model} />
      <DataSourceNotice model={model} />
      <SummaryGrid model={model} />
      <NodeStatusList nodes={model.nodes} />
      <div className="overview-split-grid">
        <LampStatusSummary lamps={model.lamps} dataSource={model.dataSource} />
        <SensorStatusSummary sensors={model.sensors} />
      </div>
      <AlertSummary alerts={model.alerts} summary={model.summary} />
    </div>
  );
}
