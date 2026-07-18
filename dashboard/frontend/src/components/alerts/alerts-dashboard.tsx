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

export function AlertsDashboard({
  rawAlerts = activityFixture.alerts,
}: Readonly<{ rawAlerts?: readonly unknown[] }>) {
  const result = adaptAlerts(rawAlerts);
  const [filters, setFilters] = useState<AlertFilters>(DEFAULT_ALERT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  if (!result.ok)
    return (
      <div className="activity-dashboard">
        <AlertsHeader />
        <AlertsErrorState message={result.error.message} />
      </div>
    );
  const entities = getAvailableAlertEntities(result.records);
  const filtered = applyAlertFilters(result.records, filters, activityFixture.windowEnd);
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
      <AlertsHeader />
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
            <p className="eyebrow">Newest first</p>
            <h2 id="alert-results-title">Alert history</h2>
          </div>
          <strong>
            {filtered.length} of {result.records.length} alerts shown
          </strong>
        </header>
        <div className="activity-workspace">
          <div>
            {filtered.length === 0 ? (
              <AlertsEmptyState fixtureEmpty={result.records.length === 0} onClear={clearFilters} />
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
