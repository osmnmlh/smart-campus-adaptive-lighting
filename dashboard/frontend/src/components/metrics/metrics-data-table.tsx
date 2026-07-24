'use client';

import type { MetricsTableRow } from '@/features/metrics/metrics-model';
import { metricUnitLabel } from '@/features/metrics/metrics-formatters';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type MetricsDataTableProps = Readonly<{
  rows: readonly MetricsTableRow[];
  caption: string;
}>;

export function MetricsDataTable({ rows, caption }: MetricsDataTableProps) {
  const { locale, t, formatDateTime, formatNumber } = useLocalization();
  if (rows.length === 0) {
    return (
      <section className="metrics-data-section" aria-labelledby="metrics-table-title">
        <h2 id="metrics-table-title">{t('metrics.accessibleData')}</h2>
        <p className="metrics-table-empty">{t('metrics.noRows')}</p>
      </section>
    );
  }

  return (
    <section className="metrics-data-section" aria-labelledby="metrics-table-title">
      <header>
        <p className="eyebrow">{t('metrics.accessibleAlternative')}</p>
        <h2 id="metrics-table-title">{t('metrics.tableTitle')}</h2>
        <p>{t('metrics.tableDescription')}</p>
      </header>
      <div className="metrics-table-scroll" tabIndex={0} aria-label={t('metrics.tableAria')}>
        <table className="metrics-data-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t('metrics.timestamp')}</th>
              <th scope="col">{t('metrics.metric')}</th>
              <th scope="col">{t('metrics.value')}</th>
              <th scope="col">{t('metrics.unit')}</th>
              <th scope="col">{t('metrics.dataSource')}</th>
              <th scope="col">{t('metrics.metricQuality')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-quality={row.quality.toLowerCase()}>
                <td>
                  <time dateTime={row.timestamp}>{formatDateTime(row.timestamp)}</time>
                </td>
                <th scope="row">{row.metric}</th>
                <td>
                  {formatNumber(row.value)}
                  {row.unit === 'PERCENT' ? '%' : ''}
                </td>
                <td>{metricUnitLabel(row.unit)}</td>
                <td>{displayEnumLabel(locale, row.source)}</td>
                <td>{displayEnumLabel(locale, row.quality)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
