'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function LogsHeader({ live = false }: Readonly<{ live?: boolean }>) {
  const { t } = useLocalization();
  return (
    <header className="activity-header">
      <div>
        <p className="eyebrow">{live ? t('logs.backendEyebrow') : t('logs.simulatedEyebrow')}</p>
        <h1>{t('logs.title')}</h1>
        <p>
          {t('logs.description', { source: live ? 'read-only backend' : t('common.simulated') })}
        </p>
      </div>
      <div className="activity-provenance" aria-label={t('logs.provenance')}>
        <strong>{live ? 'BACKEND' : 'SIMULATED'}</strong>
        <span>{live ? 'Validated REST and realtime records' : 'Data source: SIMULATED'}</span>
        <span>{live ? 'Read-only display' : 'Deterministic demo history'}</span>
        <span>{live ? 'Realtime append enabled' : t('logs.noLive')}</span>
        <span>{live ? 'Backend mode shown in header' : t('logs.notProduction')}</span>
      </div>
    </header>
  );
}
