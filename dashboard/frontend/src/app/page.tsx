'use client';

import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';
import { createOverviewModel } from '@/features/overview/overview-adapter';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';

export default function HomePage() {
  const state = useDashboardData();
  return (
    <OverviewDashboard
      model={state.snapshot === null ? null : createOverviewModel(state.snapshot)}
      errorMessage={state.snapshot === null ? state.errorMessage : null}
      live={state.configuredMode === 'live'}
    />
  );
}
