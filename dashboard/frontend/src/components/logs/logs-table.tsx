import {
  formatActivityEntity,
  formatActivityTimestamp,
  formatActivityValue,
} from '@/features/activity/activity-formatters';
import type { LogRecord } from '@/features/logs/logs-model';

type Props = Readonly<{
  records: readonly LogRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}>;

export function LogsTable({ records, selectedId, onSelect }: Props) {
  return (
    <div className="activity-table-scroll">
      <table className="activity-table">
        <caption>Simulated operational logs, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Timestamp</th>
            <th scope="col">Level</th>
            <th scope="col">Category</th>
            <th scope="col">Event</th>
            <th scope="col">Entity</th>
            <th scope="col">Scenario</th>
            <th scope="col">Source</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id} data-selected={selectedId === record.id}>
              <td>{formatActivityTimestamp(record.timestamp)}</td>
              <td>
                <span className="activity-label" data-tone={record.level.toLowerCase()}>
                  {formatActivityValue(record.level)}
                </span>
              </td>
              <td>{formatActivityValue(record.category)}</td>
              <td>
                <strong>{record.summary}</strong>
                <small>{formatActivityValue(record.eventType)}</small>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
