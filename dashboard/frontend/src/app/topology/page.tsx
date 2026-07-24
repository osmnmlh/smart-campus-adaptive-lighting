'use client';

import '@xyflow/react/dist/style.css';
import { TopologyDashboard } from '@/components/topology/topology-dashboard';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';

export default function TopologyPage() {
  const state = useDashboardData();
  if (state.snapshot === null) {
    return (
      <section className="activity-error" role="status">
        <h1>System Topology</h1>
        <p>{state.errorMessage ?? 'Waiting for the first live backend snapshot.'}</p>
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
