'use client';

import '@xyflow/react/dist/style.css';
import { TopologyDashboard } from '@/components/topology/topology-dashboard';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';
import { useLocalization } from '@/features/localization/use-localization';

export default function TopologyPage() {
  const state = useDashboardData();
  const { t } = useLocalization();
  if (state.snapshot === null) {
    return (
      <section className="activity-error" role="status">
        <h1>{t('topology.title')}</h1>
        <p>{state.errorMessage ?? t('topology.waitingSnapshot')}</p>
      </section>
    );
  }
  return (
    <TopologyDashboard
      initialGraph={createTopologyGraph(state.snapshot)}
      live={state.configuredMode === 'live'}
    />
  );
}
