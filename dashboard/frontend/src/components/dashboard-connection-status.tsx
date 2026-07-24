'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { useDashboardData } from '@/features/live-data/dashboard-data-provider';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

export function DashboardConnectionStatus() {
  const state = useDashboardData();
  const { locale, t } = useLocalization();
  const tone =
    state.transportStatus === 'CONNECTED'
      ? 'ready'
      : state.transportStatus === 'ERROR' || state.transportStatus === 'DISCONNECTED'
        ? 'warning'
        : 'neutral';
  return (
    <div className="dashboard-connection-status" aria-label={t('connection.label')}>
      <StatusBadge label={displayEnumLabel(locale, state.transportStatus)} tone={tone} />
      <span>
        {state.configuredMode === 'simulated'
          ? t('connection.localSimulated')
          : t('connection.backendMode', { mode: displayEnumLabel(locale, state.backendDataMode) })}
      </span>
    </div>
  );
}
