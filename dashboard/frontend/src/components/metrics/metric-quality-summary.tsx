'use client';

import type { MetricQualitySummary } from '@/features/metrics/metrics-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

export function MetricQualitySummaryPanel({
  summary,
}: Readonly<{ summary: MetricQualitySummary }>) {
  const { locale, t, formatDateTime } = useLocalization();
  return (
    <section className="metrics-summary-card" aria-labelledby="metric-quality-title">
      <header>
        <p className="eyebrow">{t('metrics.sourceQuality')}</p>
        <h2 id="metric-quality-title">{t('metrics.qualitySummary')}</h2>
      </header>
      <dl className="metrics-quality-grid">
        <div data-quality="good">
          <dt>{t('metrics.goodPoints')}</dt>
          <dd>{summary.good}</dd>
        </div>
        <div data-quality="stale">
          <dt>{t('metrics.stalePoints')}</dt>
          <dd>{summary.stale}</dd>
        </div>
        <div data-quality="invalid">
          <dt>{t('metrics.invalidPoints')}</dt>
          <dd>{summary.invalid}</dd>
        </div>
        <div>
          <dt>{t('metrics.dataSource')}</dt>
          <dd>{displayEnumLabel(locale, summary.source)}</dd>
        </div>
        <div>
          <dt>{t('metrics.latestTimestamp')}</dt>
          <dd>
            {summary.latestTimestamp
              ? formatDateTime(summary.latestTimestamp)
              : t('metrics.notAvailable')}
          </dd>
        </div>
      </dl>
      <p>{t('metrics.qualityNote')}</p>
    </section>
  );
}
