import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewModel } from '@/features/overview/overview-model';

type DataSourceNoticeProps = Readonly<{
  model: Pick<OverviewModel, 'dataSource'>;
}>;

export function DataSourceNotice({ model }: DataSourceNoticeProps) {
  return (
    <aside className="data-source-notice" aria-label="Data source notice">
      <StatusBadge label="Mock Data" tone="neutral" />
      <p>
        Deterministic <strong>{model.dataSource}</strong> fixture gösteriliyor. Backend bağlantısı
        henüz aktif değil.
      </p>
    </aside>
  );
}
