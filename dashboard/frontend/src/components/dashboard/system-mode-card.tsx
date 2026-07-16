import { SummaryCard } from './summary-card';
import type { OverviewModel } from '@/features/overview/overview-model';

type SystemModeCardProps = Readonly<{
  model: Pick<OverviewModel, 'systemMode' | 'systemModeLabel' | 'systemModeTone'>;
}>;

export function SystemModeCard({ model }: SystemModeCardProps) {
  return (
    <SummaryCard
      label="System Mode"
      value={model.systemMode}
      detail={model.systemModeLabel}
      statusLabel="Operational mode"
      tone={model.systemModeTone}
    />
  );
}
