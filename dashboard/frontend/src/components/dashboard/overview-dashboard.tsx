import { AlertSummary } from './alert-summary';
import { DataSourceNotice } from './data-source-notice';
import { LampBrightnessSummary, LampStatusSummary } from './lamp-status-summary';
import { NodeStatusList } from './node-status-list';
import { OverviewEmptyState } from './overview-empty-state';
import { OverviewHeader } from './overview-header';
import { SensorStatusSummary } from './sensor-status-summary';
import { SummaryGrid } from './summary-grid';
import { DisclosurePanel } from '@/components/ui/disclosure-panel';
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
      <div className="overview-primary-grid">
        <LampBrightnessSummary lamps={model.lamps} dataSource={model.dataSource} />
        <AlertSummary alerts={model.alerts} summary={model.summary} />
      </div>
      <div className="overview-advanced-details">
        <DisclosurePanel
          title="Infrastructure details"
          description="Inspect node health, communication, and lamp ownership."
          count={model.nodes.length}
        >
          <NodeStatusList nodes={model.nodes} />
        </DisclosurePanel>
        <DisclosurePanel
          title="Lighting and sensor details"
          description="Inspect health, targets, PWM values, sensor activity, and quality."
          count={model.lamps.length + model.sensors.length}
        >
          <div className="overview-split-grid">
            <LampStatusSummary
              lamps={model.lamps}
              dataSource={model.dataSource}
              showGauge={false}
            />
            <SensorStatusSummary sensors={model.sensors} />
          </div>
        </DisclosurePanel>
      </div>
    </div>
  );
}
