import { formatActivityEntity, formatActivityValue } from '@/features/activity/activity-formatters';
import { TIME_RANGES } from '@/features/activity/activity-model';
import { LOG_CATEGORIES, LOG_LEVELS, type LogFilters } from '@/features/logs/logs-model';

type Props = Readonly<{
  filters: LogFilters;
  entities: readonly string[];
  onChange: (field: keyof LogFilters, value: unknown) => void;
  onClear: () => void;
}>;

export function LogsFilters({ filters, entities, onChange, onClear }: Props) {
  return (
    <section className="activity-filters" aria-labelledby="log-filters-title">
      <div>
        <p className="eyebrow">Local filters</p>
        <h2 id="log-filters-title">Log filters</h2>
      </div>
      <label>
        <span>Category</span>
        <select
          aria-label="Log category"
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
        >
          <option value="ALL">All categories</option>
          {LOG_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {formatActivityValue(category)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Level</span>
        <select
          aria-label="Log level"
          value={filters.level}
          onChange={(event) => onChange('level', event.target.value)}
        >
          <option value="ALL">All levels</option>
          {LOG_LEVELS.map((level) => (
            <option key={level} value={level}>
              {formatActivityValue(level)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Entity</span>
        <select
          aria-label="Log entity"
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
          aria-label="Log time range"
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
