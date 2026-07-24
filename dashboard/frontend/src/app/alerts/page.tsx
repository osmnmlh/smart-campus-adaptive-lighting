'use client';

import { AlertsDashboard } from '@/components/alerts/alerts-dashboard';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';

export default function AlertsPage() {
  const state = useDashboardData();
  return (
    <AlertsDashboard
      rawAlerts={state.alerts}
      live={state.configuredMode === 'live'}
      windowEnd={state.lastUpdatedAt}
      transportError={state.snapshot === null ? state.errorMessage : null}
    />
  );
}
