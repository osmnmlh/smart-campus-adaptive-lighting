'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function TopologyToolbar({
  onFitView,
  onResetView,
  onClearSelection,
  clearSelectionDisabled,
}: Readonly<{
  onFitView: () => void;
  onResetView: () => void;
  onClearSelection: () => void;
  clearSelectionDisabled: boolean;
}>) {
  const { t } = useLocalization();
  return (
    <div className="topology-toolbar" role="toolbar" aria-label={t('topology.controls')}>
      <button type="button" onClick={onFitView} aria-label={t('topology.fit')}>
        {t('topology.fit')}
      </button>
      <button type="button" onClick={onResetView} aria-label={t('topology.reset')}>
        {t('topology.reset')}
      </button>
      <button
        type="button"
        onClick={onClearSelection}
        disabled={clearSelectionDisabled}
        aria-label={t('topology.clear')}
      >
        {t('topology.clear')}
      </button>
    </div>
  );
}
