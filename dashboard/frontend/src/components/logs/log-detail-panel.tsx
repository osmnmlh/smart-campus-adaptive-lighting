'use client';

import { formatActivityEntity, formatActivityValue } from '@/features/activity/activity-formatters';
import type { LogRecord } from '@/features/logs/logs-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

export function LogDetailPanel({ log }: Readonly<{ log: LogRecord | null }>) {
  const { locale, t, formatDateTime } = useLocalization();
  if (log === null) {
    return (
      <aside className="activity-detail" aria-labelledby="log-detail-title">
        <p className="eyebrow">{t('logs.detailTitle')}</p>
        <h2 id="log-detail-title">{t('logs.selectDetail')}</h2>
        <p>{t('logs.noActions')}</p>
      </aside>
    );
  }

  const items = [
    [t('logs.logId'), log.id],
    [t('logs.timestamp'), formatDateTime(log.timestamp)],
    [t('logs.level'), displayEnumLabel(locale, log.level)],
    [t('logs.category'), formatActivityValue(log.category)],
    [t('logs.eventType'), formatActivityValue(log.eventType)],
    [t('logs.entityType'), formatActivityValue(log.entityType)],
    [t('logs.entityId'), formatActivityEntity(log.entityId)],
    [t('logs.scenario'), log.scenarioId ?? t('common.none')],
    [t('logs.summary'), log.summary],
    [t('logs.details'), log.details],
    [t('metrics.dataSource'), displayEnumLabel(locale, log.dataSource)],
    [t('logs.sequence'), log.sequence],
  ] as const;

  return (
    <aside className="activity-detail" aria-labelledby="log-detail-title">
      <p className="eyebrow">{t('logs.detailTitle')}</p>
      <h2 id="log-detail-title">{log.summary}</h2>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>{t('logs.demoRecord')}</p>
    </aside>
  );
}
