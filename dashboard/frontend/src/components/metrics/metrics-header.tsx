'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { useLocalization } from '@/features/localization/use-localization';

export function MetricsHeader({
  snapshotAt,
  live = false,
  sampleCount = 0,
}: Readonly<{ snapshotAt: string | null; live?: boolean; sampleCount?: number }>) {
  const { t, formatDateTime } = useLocalization();
  return (
    <header className="metrics-header">
      <div>
        <p className="eyebrow">{live ? t('metrics.liveEyebrow') : t('metrics.simulatedEyebrow')}</p>
        <h1>{t('metrics.title')}</h1>
        <p>{live ? t('metrics.liveDescription') : t('metrics.simulatedDescription')}</p>
      </div>
      <div className="metrics-header-meta">
        <StatusBadge
          label={live ? t('metrics.liveSession') : t('common.simulatedData')}
          tone={live ? 'ready' : 'neutral'}
        />
        {live ? (
          <span>
            {sampleCount === 1
              ? t('metrics.sessionSample')
              : t('metrics.sessionSamples', { count: sampleCount })}
          </span>
        ) : null}
        {snapshotAt ? (
          <span>
            {live ? t('common.latestUpdate') : t('common.fixtureEnd')}:{' '}
            <time dateTime={snapshotAt}>{formatDateTime(snapshotAt)}</time>
          </span>
        ) : (
          <span>{live ? t('metrics.sessionUnavailable') : t('metrics.fixtureUnavailable')}</span>
        )}
      </div>
    </header>
  );
}
