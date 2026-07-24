'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';

export function DashboardConnectionStatus() {
  const state = useDashboardData();
  const tone =
    state.transportStatus === 'CONNECTED'
      ? 'ready'
      : state.transportStatus === 'ERROR' || state.transportStatus === 'DISCONNECTED'
        ? 'warning'
        : 'neutral';
  return (
    <div className="dashboard-connection-status" aria-label="Dashboard data connection">
      <StatusBadge label={state.transportStatus} tone={tone} />
      <span>
        {state.configuredMode === 'simulated'
          ? 'Local simulated data'
          : `Backend mode: ${state.backendDataMode}`}
      </span>
    </div>
  );
}
