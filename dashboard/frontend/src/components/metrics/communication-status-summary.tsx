'use client';

import type { CommunicationStatusItem } from '@/features/metrics/metrics-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

export function CommunicationStatusSummary({
  items,
}: Readonly<{ items: readonly CommunicationStatusItem[] }>) {
  const { locale, t, formatDateTime } = useLocalization();
  return (
    <section className="metrics-summary-card" aria-labelledby="communication-summary-title">
      <header>
        <p className="eyebrow">{t('metrics.nodeSnapshot')}</p>
        <h2 id="communication-summary-title">{t('metrics.communicationStatus')}</h2>
      </header>
      <ul className="communication-status-list">
        {items.map((item) => (
          <li key={item.nodeId}>
            <strong>{item.label}</strong>
            <span>
              {t('metrics.communication', {
                value: displayEnumLabel(locale, item.communicationHealth),
              })}
            </span>
            <span>
              {t('metrics.nodeHealth', {
                value: displayEnumLabel(locale, item.nodeHealth),
              })}
            </span>
            <span>{formatDateTime(item.latestTimestamp)}</span>
            <small>
              {t('metrics.sourceSnapshot', {
                source: displayEnumLabel(locale, item.source),
              })}
            </small>
          </li>
        ))}
      </ul>
      <p>{t('metrics.connectivityDisclaimer')}</p>
    </section>
  );
}
