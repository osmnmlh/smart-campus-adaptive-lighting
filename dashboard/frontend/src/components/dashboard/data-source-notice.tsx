'use client';

import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewModel } from '@/features/overview/overview-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type DataSourceNoticeProps = Readonly<{
  model: Pick<OverviewModel, 'dataSource'>;
  live?: boolean;
}>;

export function DataSourceNotice({ model, live = false }: DataSourceNoticeProps) {
  const { locale, t } = useLocalization();
  const source = displayEnumLabel(locale, model.dataSource);
  return (
    <aside className="data-source-notice" aria-label={t('overview.dataSourceNotice')}>
      <StatusBadge
        label={live ? t('common.backendData') : t('overview.mockData')}
        tone={live ? 'ready' : 'neutral'}
      />
      <p>{t(live ? 'overview.backendSnapshot' : 'overview.simulatedSnapshot', { source })}</p>
    </aside>
  );
}
