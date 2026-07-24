'use client';

import { useState } from 'react';
import { AlertDetailPanel } from './alert-detail-panel';
import { AlertsEmptyState } from './alerts-empty-state';
import { AlertsErrorState } from './alerts-error-state';
import { AlertsFilters } from './alerts-filters';
import { AlertsHeader } from './alerts-header';
import { AlertsSummary } from './alerts-summary';
import { AlertsTable } from './alerts-table';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptAlerts } from '@/features/alerts/alerts-adapter';
import { parseAlertFilters } from '@/features/alerts/alerts-filter-validation';
import { DEFAULT_ALERT_FILTERS, type AlertFilters } from '@/features/alerts/alerts-model';
import {
  applyAlertFilters,
  getAlertById,
  getAlertSummary,
  getAvailableAlertEntities,
} from '@/features/alerts/alerts-selectors';
import { useLocalization } from '@/features/localization/use-localization';

export function AlertsDashboard({
  rawAlerts = activityFixture.alerts,
  live = false,
  windowEnd = activityFixture.windowEnd,
  transportError = null,
}: Readonly<{
  rawAlerts?: readonly unknown[];
  live?: boolean;
  windowEnd?: string | null;
  transportError?: string | null;
}>) {
  const { t } = useLocalization();
  const result = adaptAlerts(rawAlerts, { live });
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_ALERT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  if (transportError !== null || !result.ok)
    return (
      <div className="activity-dashboard">
        <AlertsHeader live={live} />
        <AlertsErrorState
          message={transportError ?? (!result.ok ? result.error.message : '')}
          live={live}
        />
      </div>
    );
  const entities = getAvailableAlertEntities(result.records);
  const filtered = applyAlertFilters(
    result.records,
    filters,
    windowEnd ?? new Date().toISOString(),
  );
  const selected = selectedId === null ? null : getAlertById(result.records, selectedId);
  const updateFilter = (field: keyof AlertFilters, value: unknown) => {
    const parsed = parseAlertFilters({ ...filters, [field]: value }, entities);
    if (!parsed.ok) {
      setFilterError(parsed.message);
      return;
    }
    setFilters(parsed.filters);
    setFilterError(null);
  };
  const clearFilters = () => {
    setFilters(DEFAULT_ALERT_FILTERS);
    setFilterError(null);
  };
  return (
    <div className="activity-dashboard">
      <AlertsHeader live={live} />
      <AlertsSummary summary={getAlertSummary(result.records)} />
      <AlertsFilters
        filters={filters}
        entities={entities}
        onChange={updateFilter}
        onClear={clearFilters}
      />
      {filterError === null ? null : (
        <div className="activity-filter-error" role="status" aria-live="polite">
          {filterError}
        </div>
      )}
      <section className="activity-results" aria-labelledby="alert-results-title">
        <header>
          <div>
            <p className="eyebrow">{t('alerts.newestFirst')}</p>
            <h2 id="alert-results-title">{t('alerts.history')}</h2>
          </div>
          <strong>
            {t('alerts.shown', { shown: filtered.length, total: result.records.length })}
          </strong>
        </header>
        <div className="activity-workspace">
          <div>
            {filtered.length === 0 ? (
              <AlertsEmptyState
                fixtureEmpty={result.records.length === 0}
                onClear={clearFilters}
                live={live}
              />
            ) : (
              <AlertsTable records={filtered} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
          <AlertDetailPanel alert={selected} />
        </div>
      </section>
    </div>
  );
}
