import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewModel } from '@/features/overview/overview-model';

type OverviewHeaderProps = Readonly<{
  model: OverviewModel;
}>;

export function OverviewHeader({ model }: OverviewHeaderProps) {
  return (
    <header className="overview-header" aria-labelledby="page-title">
      <div className="overview-title-block">
        <p className="eyebrow">Overview dashboard</p>
        <h1 id="page-title">Smart Campus Adaptive Lighting</h1>
        <p className="overview-subtitle">
          Adaptif aydınlatma sisteminin genel durum ve operasyon görünümü.
        </p>
      </div>
      <dl className="overview-meta" aria-label="Snapshot metadata">
        <div>
          <dt>System mode</dt>
          <dd>
            <StatusBadge label={model.systemMode} tone={model.systemModeTone} />
          </dd>
        </div>
        <div>
          <dt>Snapshot time</dt>
          <dd>
            <time dateTime={model.snapshotAt}>{model.snapshotAtLabel}</time>
          </dd>
        </div>
      </dl>
    </header>
  );
}
