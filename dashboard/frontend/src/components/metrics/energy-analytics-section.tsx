'use client';

import type { EnergyAnalyticsSummary } from '@smart-campus/contracts';
import { GaugeMeter } from '@/components/ui/gauge-meter';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';
import { displayEntityId } from '@/features/overview/overview-selectors';

export function EnergyAnalyticsSection({
  summary,
  live,
}: Readonly<{ summary: EnergyAnalyticsSummary | null; live: boolean }>) {
  const { locale, t, formatNumber } = useLocalization();
  const value = (numericValue: number, unit: string) =>
    `${formatNumber(numericValue, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${unit}`;
  if (summary === null) {
    return (
      <section className="energy-analytics" aria-labelledby="energy-analytics-title">
        <p className="eyebrow">{t('metrics.energyEyebrow')}</p>
        <h2 id="energy-analytics-title">{t('metrics.energyTitle')}</h2>
        <p className="energy-empty">{t('metrics.energyUnavailable')}</p>
      </section>
    );
  }
  const stats = [
    [t('metrics.currentPower'), value(summary.currentActualPowerW, 'W'), summary.dataSource],
    [
      t('metrics.referencePower'),
      value(summary.currentReferencePowerW, 'W'),
      summary.referenceDataSource,
    ],
    [t('metrics.savedPower'), value(summary.currentSavedPowerW, 'W'), summary.savingsDataSource],
  ] as const;
  return (
    <section className="energy-analytics" aria-labelledby="energy-analytics-title">
      <header className="energy-analytics-header">
        <div>
          <p className="eyebrow">{t('metrics.energyEyebrow')}</p>
          <h2 id="energy-analytics-title">{t('metrics.energyTitle')}</h2>
        </div>
        <span>{live ? t('metrics.liveSession') : t('metrics.simulatedInputs')}</span>
      </header>
      <div className="energy-limitations" role="note" aria-label={t('metrics.energyLimitations')}>
        <strong>{t('metrics.onlyL3')}</strong>
        <span>{t('metrics.restartWarning')}</span>
        <span>
          {summary.limitationCode === 'INTEGRATION_GAP_CAPPED'
            ? t('metrics.gapCapped')
            : t('metrics.sessionOnly')}
        </span>
      </div>
      <div className="energy-overview-grid">
        <GaugeMeter
          value={summary.currentSavingsPercent}
          max={100}
          label={t('metrics.currentSavings')}
          unit="%"
          tone="ready"
          dataSource={summary.savingsDataSource}
          description={t('metrics.referenceComparison')}
        />
        <dl className="energy-stat-grid">
          {stats.map(([label, displayValue, source]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{displayValue}</dd>
              <small>{t('common.source', { source: displayEnumLabel(locale, source) })}</small>
            </div>
          ))}
          <div>
            <dt>{t('metrics.sessionEnergy')}</dt>
            <dd>{value(summary.actualSessionEnergyWh, 'Wh')}</dd>
            <small>SESSION_ONLY</small>
          </div>
          <div>
            <dt>{t('metrics.sessionSaved')}</dt>
            <dd>{value(summary.savedSessionEnergyWh, 'Wh')}</dd>
            <small>
              {t('metrics.sessionSavings', {
                value: formatNumber(summary.sessionSavingsPercent),
              })}
            </small>
          </div>
          <div>
            <dt>{t('metrics.coverage')}</dt>
            <dd>
              {summary.measuredLampCount}/{summary.totalLampCount} (
              {formatNumber(summary.measurementCoveragePercent)}%)
            </dd>
            <small>
              {summary.simulatedLampCount > 0
                ? displayEnumLabel(locale, 'SIMULATED')
                : summary.quality}
            </small>
          </div>
        </dl>
      </div>
      <div className="energy-lamp-breakdown">
        <h3>{t('metrics.breakdown')}</h3>
        <ul>
          {summary.lamps.map((lamp) => (
            <li key={lamp.lampId}>
              <strong>{displayEntityId(lamp.lampId)}</strong>
              <span>
                {t('metrics.brightness', { value: formatNumber(lamp.brightnessPercent) })}
              </span>
              <span>{value(lamp.currentPowerW, 'W')}</span>
              <span className="data-provenance">
                {t('common.source', { source: displayEnumLabel(locale, lamp.dataSource) })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
