'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function AlertsHeader({ live = false }: Readonly<{ live?: boolean }>) {
  const { t } = useLocalization();
  return (
    <header className="activity-header">
      <div>
        <p className="eyebrow">
          {live ? t('alerts.backendEyebrow') : t('alerts.simulatedEyebrow')}
        </p>
        <h1>{t('alerts.title')}</h1>
        <p>
          {t('alerts.description', { source: live ? 'read-only backend' : t('common.simulated') })}
        </p>
      </div>
      <div className="activity-provenance" aria-label={t('alerts.provenance')}>
        <strong>{live ? 'BACKEND' : 'SIMULATED'}</strong>
        <span>{live ? 'Validated REST and realtime records' : 'Data source: SIMULATED'}</span>
        <span>{live ? 'Read-only display' : 'Deterministic demo history'}</span>
        <span>{live ? 'No incident mutations' : t('alerts.noLive')}</span>
        <span>{live ? 'Backend mode shown in header' : t('alerts.notProduction')}</span>
      </div>
    </header>
  );
}
