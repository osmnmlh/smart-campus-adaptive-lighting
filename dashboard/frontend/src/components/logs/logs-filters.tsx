'use client';

import { formatActivityEntity, formatActivityValue } from '@/features/activity/activity-formatters';
import { TIME_RANGES } from '@/features/activity/activity-model';
import { LOG_CATEGORIES, LOG_LEVELS, type LogFilters } from '@/features/logs/logs-model';
import { useLocalization } from '@/features/localization/use-localization';

export function LogsFilters({
  filters,
  entities,
  onChange,
  onClear,
}: Readonly<{
  filters: LogFilters;
  entities: readonly string[];
  onChange: (field: keyof LogFilters, value: unknown) => void;
  onClear: () => void;
}>) {
  const { t } = useLocalization();
  return (
    <section className="activity-filters" aria-labelledby="log-filters-title">
      <div>
        <p className="eyebrow">{t('alerts.localFilters')}</p>
        <h2 id="log-filters-title">{t('logs.filters')}</h2>
      </div>
      <label>
        <span>{t('logs.category')}</span>
        <select
          aria-label={t('logs.categoryAria')}
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
        >
          <option value="ALL">{t('logs.allCategories')}</option>
          {LOG_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {formatActivityValue(value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('logs.level')}</span>
        <select
          aria-label={t('logs.levelAria')}
          value={filters.level}
          onChange={(event) => onChange('level', event.target.value)}
        >
          <option value="ALL">{t('logs.allLevels')}</option>
          {LOG_LEVELS.map((value) => (
            <option key={value} value={value}>
              {formatActivityValue(value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('alerts.entity')}</span>
        <select
          aria-label={t('logs.entityAria')}
          value={filters.entityId}
          onChange={(event) => onChange('entityId', event.target.value)}
        >
          <option value="ALL">{t('alerts.allEntities')}</option>
          {entities.map((id) => (
            <option key={id} value={id}>
              {formatActivityEntity(id)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('alerts.timeRange')}</span>
        <select
          aria-label={t('logs.timeRangeAria')}
          value={filters.timeRange}
          onChange={(event) => onChange('timeRange', event.target.value)}
        >
          {TIME_RANGES.map((range) => (
            <option key={range} value={range}>
              {range === 'all' ? t('alerts.allHistory') : t('alerts.lastRange', { range })}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="activity-clear" onClick={onClear}>
        {t('alerts.clearFilters')}
      </button>
    </section>
  );
}
