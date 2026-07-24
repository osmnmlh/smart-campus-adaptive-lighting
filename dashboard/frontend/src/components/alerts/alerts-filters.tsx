'use client';

import { AlertSeverity, AlertStatus } from '@smart-campus/contracts';
import { formatActivityEntity } from '@/features/activity/activity-formatters';
import { TIME_RANGES } from '@/features/activity/activity-model';
import type { AlertFilters } from '@/features/alerts/alerts-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

export function AlertsFilters({
  filters,
  entities,
  onChange,
  onClear,
}: Readonly<{
  filters: AlertFilters;
  entities: readonly string[];
  onChange: (field: keyof AlertFilters, value: unknown) => void;
  onClear: () => void;
}>) {
  const { locale, t } = useLocalization();
  return (
    <section className="activity-filters" aria-labelledby="alert-filters-title">
      <div>
        <p className="eyebrow">{t('alerts.localFilters')}</p>
        <h2 id="alert-filters-title">{t('alerts.filters')}</h2>
      </div>
      <label>
        <span>{t('alerts.severity')}</span>
        <select
          aria-label={t('alerts.severityAria')}
          value={filters.severity}
          onChange={(event) => onChange('severity', event.target.value)}
        >
          <option value="ALL">{t('alerts.allSeverities')}</option>
          {Object.values(AlertSeverity).map((value) => (
            <option key={value} value={value}>
              {displayEnumLabel(locale, value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('alerts.status')}</span>
        <select
          aria-label={t('alerts.statusAria')}
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="ALL">{t('alerts.allStatuses')}</option>
          {Object.values(AlertStatus).map((value) => (
            <option key={value} value={value}>
              {displayEnumLabel(locale, value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('alerts.entity')}</span>
        <select
          aria-label={t('alerts.entityAria')}
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
          aria-label={t('alerts.timeRangeAria')}
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
