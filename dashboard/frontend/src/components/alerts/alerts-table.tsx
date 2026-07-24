'use client';

import { formatActivityEntity } from '@/features/activity/activity-formatters';
import type { AlertRecord } from '@/features/alerts/alerts-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type Props = Readonly<{
  records: readonly AlertRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

export function AlertsTable({ records, selectedId, onSelect }: Props) {
  const { locale, t, formatDateTime } = useLocalization();
  return (
    <div className="activity-table-scroll">
      <table className="activity-table">
        <caption>{t('alerts.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('alerts.createdAt')}</th>
            <th scope="col">{t('alerts.severity')}</th>
            <th scope="col">{t('alerts.status')}</th>
            <th scope="col">{t('alerts.alert')}</th>
            <th scope="col">{t('alerts.entity')}</th>
            <th scope="col">{t('alerts.scenario')}</th>
            <th scope="col">{t('overview.source')}</th>
            <th scope="col">{t('alerts.details')}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const critical = record.severity === 'CRITICAL';
            const activeCritical = critical && record.status === 'ACTIVE';

            return (
              <tr
                key={record.id}
                className={
                  activeCritical
                    ? 'alert-row--critical-active'
                    : critical
                      ? 'alert-row--critical'
                      : undefined
                }
                data-selected={selectedId === record.id}
                data-severity={record.severity}
                data-status={record.status}
                data-active={record.status === 'ACTIVE'}
              >
                <td>{formatDateTime(record.createdAt)}</td>
                <td>
                  <span className="activity-label" data-tone={record.severity.toLowerCase()}>
                    {displayEnumLabel(locale, record.severity)}
                  </span>
                </td>
                <td>
                  <span className="activity-label" data-tone={record.status.toLowerCase()}>
                    {displayEnumLabel(locale, record.status)}
                  </span>
                </td>
                <td>
                  <strong>{record.title}</strong>
                  <small>{record.id}</small>
                </td>
                <td>{formatActivityEntity(record.entityId)}</td>
                <td>{record.scenarioId ?? t('common.none')}</td>
                <td>{displayEnumLabel(locale, record.dataSource)}</td>
                <td>
                  <button
                    type="button"
                    aria-pressed={selectedId === record.id}
                    onClick={() => onSelect(record.id)}
                  >
                    {t('alerts.view', { id: record.id })}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
