'use client';

import { LogsDashboard } from '@/components/logs/logs-dashboard';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';

export default function LogsPage() {
  const state = useDashboardData();
  return (
    <LogsDashboard
      rawLogs={state.logs}
      live={state.configuredMode === 'live'}
      windowEnd={state.lastUpdatedAt}
      transportError={state.snapshot === null ? state.errorMessage : null}
    />
  );
}
