import {
  formatActivityEntity,
  formatActivityTimestamp,
  formatActivityValue,
} from '@/features/activity/activity-formatters';
import type { AlertRecord } from '@/features/alerts/alerts-model';

type Props = Readonly<{
  records: readonly AlertRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

export function AlertsTable({ records, selectedId, onSelect }: Props) {
  return (
    <div className="activity-table-scroll">
      <table className="activity-table">
        <caption>Simulated alert history, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Created at</th>
            <th scope="col">Severity</th>
            <th scope="col">Status</th>
            <th scope="col">Alert</th>
            <th scope="col">Entity</th>
            <th scope="col">Scenario</th>
            <th scope="col">Source</th>
            <th scope="col">Details</th>
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
                <td>{formatActivityTimestamp(record.createdAt)}</td>
                <td>
                  <span className="activity-label" data-tone={record.severity.toLowerCase()}>
                    {formatActivityValue(record.severity)}
                  </span>
                </td>
                <td>
                  <span className="activity-label" data-tone={record.status.toLowerCase()}>
                    {formatActivityValue(record.status)}
                  </span>
                </td>
                <td>
                  <strong>{record.title}</strong>
                  <small>{record.id}</small>
                </td>
                <td>{formatActivityEntity(record.entityId)}</td>
                <td>{record.scenarioId ?? 'None'}</td>
                <td>{record.dataSource}</td>
                <td>
                  <button
                    type="button"
                    aria-pressed={selectedId === record.id}
                    onClick={() => onSelect(record.id)}
                  >
                    View {record.id}
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
