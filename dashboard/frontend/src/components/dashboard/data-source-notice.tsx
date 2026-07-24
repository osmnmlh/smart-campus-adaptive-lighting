import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewModel } from '@/features/overview/overview-model';

type DataSourceNoticeProps = Readonly<{
  model: Pick<OverviewModel, 'dataSource'>;
  live?: boolean;
}>;

export function DataSourceNotice({ model, live = false }: DataSourceNoticeProps) {
  return (
    <aside className="data-source-notice" aria-label="Data source notice">
      <StatusBadge label={live ? 'Backend Data' : 'Mock Data'} tone={live ? 'ready' : 'neutral'} />
      {live ? (
        <p>
          Backend transportundan doğrulanan <strong>{model.dataSource}</strong> snapshot
          gösteriliyor.
        </p>
      ) : (
        <p>
          Deterministic <strong>{model.dataSource}</strong> fixture gösteriliyor. Backend bağlantısı
          henüz aktif değil.
        </p>
      )}
    </aside>
  );
}
