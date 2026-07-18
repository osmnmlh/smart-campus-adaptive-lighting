import {
  formatActivityEntity,
  formatActivityTimestamp,
  formatActivityValue,
} from '@/features/activity/activity-formatters';
import type { LogRecord } from '@/features/logs/logs-model';

export function LogDetailPanel({ log }: Readonly<{ log: LogRecord | null }>) {
  if (log === null) {
    return (
      <aside className="activity-detail" aria-labelledby="log-detail-title">
        <p className="eyebrow">Log details</p>
        <h2 id="log-detail-title">Select a log to inspect its details</h2>
        <p>No replay, deletion, or export action is available in this deterministic demo.</p>
      </aside>
    );
  }

  const items = [
    ['Log ID', log.id],
    ['Timestamp', formatActivityTimestamp(log.timestamp)],
    ['Level', formatActivityValue(log.level)],
    ['Category', formatActivityValue(log.category)],
    ['Event type', formatActivityValue(log.eventType)],
    ['Entity type', formatActivityValue(log.entityType)],
    ['Entity ID', formatActivityEntity(log.entityId)],
    ['Scenario', log.scenarioId ?? 'None'],
    ['Summary', log.summary],
    ['Details', log.details],
    ['Data source', log.dataSource],
    ['Sequence', log.sequence],
  ] as const;

  return (
    <aside className="activity-detail" aria-labelledby="log-detail-title">
      <p className="eyebrow">Log details</p>
      <h2 id="log-detail-title">{log.summary}</h2>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>Simulated demo record; not a production log.</p>
    </aside>
  );
}
