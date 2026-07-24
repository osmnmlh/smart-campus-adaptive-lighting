import type { EnergyAnalyticsSummary } from '@smart-campus/contracts';

import { GaugeMeter } from '@/components/ui/gauge-meter';
import { displayEntityId } from '@/features/overview/overview-selectors';

function value(value: number, unit: string): string {
  return `${value.toFixed(2)} ${unit}`;
}

export function EnergyAnalyticsSection({
  summary,
  live,
}: Readonly<{ summary: EnergyAnalyticsSummary | null; live: boolean }>) {
  if (summary === null) {
    return (
      <section className="energy-analytics" aria-labelledby="energy-analytics-title">
        <p className="eyebrow">MVP estimate</p>
        <h2 id="energy-analytics-title">Energy Analytics</h2>
        <p className="energy-empty">
          Energy summary is unavailable until the live backend initial load succeeds.
        </p>
      </section>
    );
  }

  return (
    <section className="energy-analytics" aria-labelledby="energy-analytics-title">
      <header className="energy-analytics-header">
        <div>
          <p className="eyebrow">MVP estimate</p>
          <h2 id="energy-analytics-title">Energy Analytics</h2>
        </div>
        <span>{live ? 'Live session' : 'Simulated inputs'}</span>
      </header>

      <div className="energy-limitations" role="note" aria-label="Energy analytics limitations">
        <strong>Only L3 is directly measured</strong>
        <span>Session values reset when the backend restarts</span>
        <span>
          {summary.limitationCode === 'INTEGRATION_GAP_CAPPED'
            ? 'Integration gap was capped; missing time was not invented'
            : 'Session-only integration; no persistent history'}
        </span>
      </div>

      <div className="energy-overview-grid">
        <GaugeMeter
          value={summary.currentSavingsPercent}
          max={100}
          label="Current savings"
          unit="%"
          tone="ready"
          dataSource={summary.savingsDataSource}
          description="Full-brightness reference comparison"
        />
        <dl className="energy-stat-grid">
          <div>
            <dt>Current system power</dt>
            <dd>{value(summary.currentActualPowerW, 'W')}</dd>
            <small>Source: {summary.dataSource}</small>
          </div>
          <div>
            <dt>Full-brightness reference</dt>
            <dd>{value(summary.currentReferencePowerW, 'W')}</dd>
            <small>Source: {summary.referenceDataSource}</small>
          </div>
          <div>
            <dt>Current saved power</dt>
            <dd>{value(summary.currentSavedPowerW, 'W')}</dd>
            <small>Source: {summary.savingsDataSource}</small>
          </div>
          <div>
            <dt>Session energy</dt>
            <dd>{value(summary.actualSessionEnergyWh, 'Wh')}</dd>
            <small>SESSION_ONLY</small>
          </div>
          <div>
            <dt>Session saved energy</dt>
            <dd>{value(summary.savedSessionEnergyWh, 'Wh')}</dd>
            <small>{summary.sessionSavingsPercent.toFixed(1)}% session savings</small>
          </div>
          <div>
            <dt>Measurement coverage</dt>
            <dd>
              {summary.measuredLampCount}/{summary.totalLampCount} (
              {summary.measurementCoveragePercent.toFixed(0)}%)
            </dd>
            <small>{summary.simulatedLampCount > 0 ? 'SIMULATED' : summary.quality}</small>
          </div>
        </dl>
      </div>

      <div className="energy-lamp-breakdown">
        <h3>L1–L5 breakdown</h3>
        <ul>
          {summary.lamps.map((lamp) => (
            <li key={lamp.lampId}>
              <strong>{displayEntityId(lamp.lampId)}</strong>
              <span>{lamp.brightnessPercent.toFixed(0)}% brightness</span>
              <span>{value(lamp.currentPowerW, 'W')}</span>
              <span className="data-provenance">Source: {lamp.dataSource}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
