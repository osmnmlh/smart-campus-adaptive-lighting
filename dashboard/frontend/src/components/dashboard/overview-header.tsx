'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';
import type { OverviewModel } from '@/features/overview/overview-model';

export function OverviewHeader({ model }: Readonly<{ model: OverviewModel }>) {
  const { locale, t, formatDateTime } = useLocalization();
  return (
    <header className="overview-header" aria-labelledby="page-title">
      <div className="overview-title-block">
        <p className="eyebrow">{t('overview.eyebrow')}</p>
        <h1 id="page-title">Smart Campus Adaptive Lighting</h1>
        <p className="overview-subtitle">{t('overview.subtitle')}</p>
      </div>
      <dl className="overview-meta" aria-label={t('overview.snapshotMetadata')}>
        <div>
          <dt>{t('overview.systemMode')}</dt>
          <dd>
            <StatusBadge
              label={displayEnumLabel(locale, model.systemMode)}
              tone={model.systemModeTone}
            />
          </dd>
        </div>
        <div>
          <dt>{t('overview.snapshotTime')}</dt>
          <dd>
            <time dateTime={model.snapshotAt}>{formatDateTime(model.snapshotAt)}</time>
          </dd>
        </div>
      </dl>
    </header>
  );
}
