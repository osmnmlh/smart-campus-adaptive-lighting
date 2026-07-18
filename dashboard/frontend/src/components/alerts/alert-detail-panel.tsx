import {
  formatActivityEntity,
  formatActivityTimestamp,
  formatActivityValue,
} from '@/features/activity/activity-formatters';
import type { AlertRecord } from '@/features/alerts/alerts-model';

export function AlertDetailPanel({ alert }: Readonly<{ alert: AlertRecord | null }>) {
  if (alert === null)
    return (
      <aside className="activity-detail" aria-labelledby="alert-detail-title">
        <p className="eyebrow">Alert details</p>
        <h2 id="alert-detail-title">Select an alert to inspect its details</h2>
        <p>No incident action is available in this deterministic demo.</p>
      </aside>
    );
  const items = [
    ['Alert ID', alert.id],
    ['Title', alert.title],
    ['Description', alert.description],
    ['Severity', formatActivityValue(alert.severity)],
    ['Status', formatActivityValue(alert.status)],
    ['Entity type', formatActivityValue(alert.entityType)],
    ['Entity ID', formatActivityEntity(alert.entityId)],
    ['Created at', formatActivityTimestamp(alert.createdAt)],
    [
      'Resolved at',
      alert.resolvedAt === null ? 'Not resolved' : formatActivityTimestamp(alert.resolvedAt),
    ],
    ['Scenario', alert.scenarioId ?? 'None'],
    ['Data source', alert.dataSource],
  ] as const;
  return (
    <aside className="activity-detail" aria-labelledby="alert-detail-title">
      <p className="eyebrow">Alert details</p>
      <h2 id="alert-detail-title">{alert.title}</h2>
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>Simulated demo record; not a production incident.</p>
    </aside>
  );
}
