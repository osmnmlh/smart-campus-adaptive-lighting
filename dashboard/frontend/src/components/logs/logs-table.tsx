'use client';

import { formatActivityEntity, formatActivityValue } from '@/features/activity/activity-formatters';
import type { LogRecord } from '@/features/logs/logs-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type Props = Readonly<{
  records: readonly LogRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

export function LogsTable({ records, selectedId, onSelect }: Props) {
  const { locale, t, formatDateTime } = useLocalization();
  return (
    <div className="activity-table-scroll">
      <table className="activity-table">
        <caption>{t('logs.tableCaption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('logs.timestamp')}</th>
            <th scope="col">{t('logs.level')}</th>
            <th scope="col">{t('logs.category')}</th>
            <th scope="col">{t('logs.event')}</th>
            <th scope="col">{t('alerts.entity')}</th>
            <th scope="col">{t('logs.scenario')}</th>
            <th scope="col">{t('logs.source')}</th>
            <th scope="col">{t('logs.details')}</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} data-selected={selectedId === record.id}>
              <td>{formatDateTime(record.timestamp)}</td>
              <td>
                <span className="activity-label" data-tone={record.level.toLowerCase()}>
                  {displayEnumLabel(locale, record.level)}
                </span>
              </td>
              <td>{formatActivityValue(record.category)}</td>
              <td>
                <strong>{record.summary}</strong>
                <small>{formatActivityValue(record.eventType)}</small>
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
                  {t('logs.view', { id: record.id })}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
