'use client';

import { formatActivityEntity, formatActivityValue } from '@/features/activity/activity-formatters';
import type { AlertRecord } from '@/features/alerts/alerts-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

export function AlertDetailPanel({ alert }: Readonly<{ alert: AlertRecord | null }>) {
  const { locale, t, formatDateTime } = useLocalization();
  if (alert === null)
    return (
      <aside className="activity-detail" aria-labelledby="alert-detail-title">
        <p className="eyebrow">{t('alerts.detailTitle')}</p>
        <h2 id="alert-detail-title">{t('alerts.selectDetail')}</h2>
        <p>{t('alerts.noIncidentAction')}</p>
      </aside>
    );
  const items = [
    [t('alerts.alertId'), alert.id],
    [t('alerts.titleLabel'), alert.title],
    [t('alerts.descriptionLabel'), alert.description],
    [t('alerts.severity'), displayEnumLabel(locale, alert.severity)],
    [t('alerts.status'), displayEnumLabel(locale, alert.status)],
    [t('alerts.entityType'), formatActivityValue(alert.entityType)],
    [t('alerts.entityId'), formatActivityEntity(alert.entityId)],
    [t('alerts.createdAt'), formatDateTime(alert.createdAt)],
    [
      t('alerts.resolvedAt'),
      alert.resolvedAt === null ? t('alerts.notResolved') : formatDateTime(alert.resolvedAt),
    ],
    [t('alerts.scenario'), alert.scenarioId ?? t('common.none')],
    [t('metrics.dataSource'), displayEnumLabel(locale, alert.dataSource)],
  ] as const;
  return (
    <aside className="activity-detail" aria-labelledby="alert-detail-title">
      <p className="eyebrow">{t('alerts.detailTitle')}</p>
      <h2 id="alert-detail-title">{alert.title}</h2>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>{t('alerts.demoRecord')}</p>
    </aside>
  );
}
