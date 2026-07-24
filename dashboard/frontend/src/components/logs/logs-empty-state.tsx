'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function LogsEmptyState({
  fixtureEmpty,
  onClear,
  live = false,
}: Readonly<{ fixtureEmpty: boolean; onClear: () => void; live?: boolean }>) {
  const { t } = useLocalization();
  return (
    <div className="activity-empty">
      <h3>
        {fixtureEmpty
          ? t('logs.noFixture', {
              source: live ? t('common.backendData') : t('common.simulatedData'),
            })
          : t('logs.noMatches')}
      </h3>
      <p>{fixtureEmpty ? t('logs.fixtureEmpty') : t('logs.chooseFilters')}</p>
      {fixtureEmpty ? null : (
        <button type="button" onClick={onClear}>
          {t('alerts.clearFilters')}
        </button>
      )}
    </div>
  );
}
