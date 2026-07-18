import { AlertSeverity, AlertStatus } from '@smart-campus/contracts';
import { formatActivityEntity, formatActivityValue } from '@/features/activity/activity-formatters';
import { TIME_RANGES } from '@/features/activity/activity-model';
import type { AlertFilters } from '@/features/alerts/alerts-model';

type Props = Readonly<{
  filters: AlertFilters;
  entities: readonly string[];
  onChange: (field: keyof AlertFilters, value: unknown) => void;
  onClear: () => void;
}>;

export function AlertsFilters({ filters, entities, onChange, onClear }: Props) {
  return (
    <section className="activity-filters" aria-labelledby="alert-filters-title">
      <div>
        <p className="eyebrow">Local filters</p>
        <h2 id="alert-filters-title">Alert filters</h2>
      </div>
      <label>
        <span>Severity</span>
        <select
          aria-label="Alert severity"
          value={filters.severity}
          onChange={(event) => onChange('severity', event.target.value)}
        >
          <option value="ALL">All severities</option>
          {Object.values(AlertSeverity).map((severity) => (
            <option key={severity} value={severity}>
              {formatActivityValue(severity)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select
          aria-label="Alert status"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="ALL">All statuses</option>
          {Object.values(AlertStatus).map((status) => (
            <option key={status} value={status}>
              {formatActivityValue(status)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Entity</span>
        <select
          aria-label="Alert entity"
          value={filters.entityId}
          onChange={(event) => onChange('entityId', event.target.value)}
        >
          <option value="ALL">All entities</option>
          {entities.map((entityId) => (
            <option key={entityId} value={entityId}>
              {formatActivityEntity(entityId)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Time range</span>
        <select
          aria-label="Alert time range"
          value={filters.timeRange}
          onChange={(event) => onChange('timeRange', event.target.value)}
        >
          {TIME_RANGES.map((range) => (
            <option key={range} value={range}>
              {range === 'all' ? 'All history' : `Last ${range}`}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="activity-clear" onClick={onClear}>
        Clear filters
      </button>
    </section>
  );
}
