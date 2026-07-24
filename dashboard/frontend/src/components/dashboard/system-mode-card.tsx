'use client';

import { SummaryCard } from './summary-card';
import type { OverviewModel } from '@/features/overview/overview-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type SystemModeCardProps = Readonly<{
  model: Pick<OverviewModel, 'systemMode' | 'systemModeLabel' | 'systemModeTone'>;
}>;

export function SystemModeCard({ model }: SystemModeCardProps) {
  const { locale, t } = useLocalization();
  return (
    <SummaryCard
      label={t('overview.systemMode')}
      value={displayEnumLabel(locale, model.systemMode)}
      detail={displayEnumLabel(locale, model.systemMode)}
      statusLabel={t('overview.operationalMode')}
      tone={model.systemModeTone}
    />
  );
}
