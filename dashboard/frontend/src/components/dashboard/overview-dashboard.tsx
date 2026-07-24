'use client';

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
import { useLocalization } from '@/features/localization/use-localization';

type OverviewDashboardProps = Readonly<{
  model: OverviewModel | null;
  errorMessage?: string | null;
  live?: boolean;
}>;

export function OverviewDashboard({
  model,
  errorMessage = null,
  live = false,
}: OverviewDashboardProps) {
  const { t } = useLocalization();
  if (errorMessage) {
    return <OverviewEmptyState variant="error" message={errorMessage} />;
  }

  if (!model) {
    return <OverviewEmptyState />;
  }

  return (
    <div className="overview-dashboard">
      <OverviewHeader model={model} />
      <DataSourceNotice model={model} live={live} />
      <SummaryGrid model={model} />
      <div className="overview-primary-grid">
        <LampBrightnessSummary lamps={model.lamps} dataSource={model.dataSource} />
        <AlertSummary alerts={model.alerts} summary={model.summary} />
      </div>
      <div className="overview-advanced-details">
        <DisclosurePanel
          title={t('overview.infrastructureTitle')}
          description={t('overview.infrastructureDescription')}
          count={model.nodes.length}
        >
          <NodeStatusList nodes={model.nodes} />
        </DisclosurePanel>
        <DisclosurePanel
          title={t('overview.lightingTitle')}
          description={t('overview.lightingDescription')}
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
