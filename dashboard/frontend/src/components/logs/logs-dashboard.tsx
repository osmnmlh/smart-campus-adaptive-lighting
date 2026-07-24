'use client';

import { useState } from 'react';
import { LogDetailPanel } from './log-detail-panel';
import { LogsEmptyState } from './logs-empty-state';
import { LogsErrorState } from './logs-error-state';
import { LogsFilters } from './logs-filters';
import { LogsHeader } from './logs-header';
import { LogsSummary } from './logs-summary';
import { LogsTable } from './logs-table';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptLogs } from '@/features/logs/logs-adapter';
import { parseLogFilters } from '@/features/logs/logs-filter-validation';
import { DEFAULT_LOG_FILTERS, type LogFilters } from '@/features/logs/logs-model';
import {
  applyLogFilters,
  getAvailableLogEntities,
  getLogById,
  getLogSummary,
} from '@/features/logs/logs-selectors';

export function LogsDashboard({
  rawLogs = activityFixture.logs,
  live = false,
  windowEnd = activityFixture.windowEnd,
  transportError = null,
}: Readonly<{
  rawLogs?: readonly unknown[];
  live?: boolean;
  windowEnd?: string | null;
  transportError?: string | null;
}>) {
  const result = adaptLogs(rawLogs, { live });
  const [filters, setFilters] = useState<LogFilters>(DEFAULT_LOG_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  if (transportError !== null || !result.ok) {
    return (
      <div className="activity-dashboard">
        <LogsHeader live={live} />
        <LogsErrorState
          message={transportError ?? (!result.ok ? result.error.message : '')}
          live={live}
        />
      </div>
    );
  }

  const entities = getAvailableLogEntities(result.records);
  const filtered = applyLogFilters(result.records, filters, windowEnd ?? new Date().toISOString());
  const selected = selectedId === null ? null : getLogById(result.records, selectedId);
  const updateFilter = (field: keyof LogFilters, value: unknown) => {
    const parsed = parseLogFilters({ ...filters, [field]: value }, entities);
    if (!parsed.ok) {
      setFilterError(parsed.message);
      return;
    }
    setFilters(parsed.filters);
    setFilterError(null);
  };
  const clearFilters = () => {
    setFilters(DEFAULT_LOG_FILTERS);
    setFilterError(null);
  };

  return (
    <div className="activity-dashboard">
      <LogsHeader live={live} />
      <LogsSummary summary={getLogSummary(result.records)} />
      <LogsFilters
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
      <section className="activity-results" aria-labelledby="log-results-title">
        <header>
          <div>
            <p className="eyebrow">Newest first</p>
            <h2 id="log-results-title">Operational log history</h2>
          </div>
          <strong>
            {filtered.length} of {result.records.length} logs shown
          </strong>
        </header>
        <div className="activity-workspace">
          <div>
            {filtered.length === 0 ? (
              <LogsEmptyState
                fixtureEmpty={result.records.length === 0}
                onClear={clearFilters}
                live={live}
              />
            ) : (
              <LogsTable records={filtered} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
          <LogDetailPanel log={selected} />
        </div>
      </section>
    </div>
  );
}
