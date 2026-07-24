'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function AlertsEmptyState({
  fixtureEmpty,
  onClear,
  live = false,
}: Readonly<{ fixtureEmpty: boolean; onClear: () => void; live?: boolean }>) {
  const { t } = useLocalization();
  return (
    <div className="activity-empty">
      <h3>
        {fixtureEmpty
          ? t('alerts.noFixture', {
              source: live ? t('common.backendData') : t('common.simulatedData'),
            })
          : t('alerts.noMatches')}
      </h3>
      <p>{fixtureEmpty ? t('alerts.fixtureEmpty') : t('alerts.chooseFilters')}</p>
      {fixtureEmpty ? null : (
        <button type="button" onClick={onClear}>
          {t('alerts.clearFilters')}
        </button>
      )}
    </div>
  );
}
