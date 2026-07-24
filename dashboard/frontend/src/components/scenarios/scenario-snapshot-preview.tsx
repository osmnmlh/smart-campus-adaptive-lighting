'use client';

import type { ScenarioSnapshotPreview as Snapshot } from '@/features/scenarios/scenario-model';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

const lifecycleTone: Record<Snapshot['lifecycle'], StatusTone> = {
  IDLE: 'neutral',
  READY: 'ready',
  RUNNING: 'ready',
  PAUSED: 'warning',
  COMPLETED: 'neutral',
  ERROR: 'critical',
};

export function ScenarioSnapshotPreview({ snapshot }: Readonly<{ snapshot: Snapshot | null }>) {
  const { locale, t } = useLocalization();
  if (snapshot === null) {
    return (
      <section className="scenario-snapshot-card" aria-labelledby="scenario-snapshot-title">
        <header>
          <div>
            <p className="eyebrow">{t('scenarios.readOnlyProjection')}</p>
            <h2 id="scenario-snapshot-title">{t('scenarios.snapshotPreview')}</h2>
          </div>
          <StatusBadge label={t('scenarios.unavailable')} tone="neutral" />
        </header>
        <p className="scenario-empty-list">{t('scenarios.createSnapshot')}</p>
      </section>
    );
  }

  return (
    <section className="scenario-snapshot-card" aria-labelledby="scenario-snapshot-title">
      <header>
        <div>
          <p className="eyebrow">{t('scenarios.readOnlyProjection')}</p>
          <h2 id="scenario-snapshot-title">{t('scenarios.snapshotPreview')}</h2>
        </div>
        <StatusBadge label={snapshot.lifecycle} tone={lifecycleTone[snapshot.lifecycle]} />
      </header>
      <dl className="scenario-snapshot-grid">
        <div>
          <dt>{t('scenarios.systemMode')}</dt>
          <dd>{displayEnumLabel(locale, snapshot.systemMode)}</dd>
        </div>
        <div>
          <dt>{t('scenarios.virtualTimestamp')}</dt>
          <dd>{snapshot.virtualTimestamp}</dd>
        </div>
        <div>
          <dt>{t('scenarios.direction')}</dt>
          <dd>{snapshot.direction}</dd>
        </div>
        <div>
          <dt>{t('scenarios.activeNodes')}</dt>
          <dd>
            {snapshot.activeNodeCount} / {snapshot.totalNodeCount}
          </dd>
        </div>
        <div>
          <dt>{t('scenarios.activeLamps')}</dt>
          <dd>{snapshot.activeLampCount}</dd>
        </div>
        <div>
          <dt>{t('scenarios.prelightLamps')}</dt>
          <dd>{snapshot.preLightLampCount}</dd>
        </div>
        <div>
          <dt>{t('scenarios.standbyLamps')}</dt>
          <dd>{snapshot.standbyLampCount}</dd>
        </div>
        <div>
          <dt>{t('scenarios.offLamps')}</dt>
          <dd>{snapshot.offLampCount}</dd>
        </div>
        <div>
          <dt>{t('scenarios.totalLamps')}</dt>
          <dd>{snapshot.totalLampCount}</dd>
        </div>
        <div>
          <dt>{t('scenarios.activeSensors')}</dt>
          <dd>
            {snapshot.activeSensorCount} / {snapshot.totalSensorCount}
          </dd>
        </div>
        <div className="scenario-sensor-ids">
          <dt>{t('scenarios.activeSensorIds')}</dt>
          <dd>
            {snapshot.activeSensorIds.length === 0
              ? t('common.none')
              : snapshot.activeSensorIds.join(', ')}
          </dd>
        </div>
        <div className="scenario-sensor-ids">
          <dt>{t('scenarios.offlineNodeIds')}</dt>
          <dd>
            {snapshot.offlineNodeIds.length === 0
              ? t('common.none')
              : snapshot.offlineNodeIds.join(', ')}
          </dd>
        </div>
        <div>
          <dt>{t('scenarios.activeAlerts')}</dt>
          <dd>{snapshot.activeAlertCount}</dd>
        </div>
        <div>
          <dt>{t('scenarios.dataSource')}</dt>
          <dd>{displayEnumLabel(locale, snapshot.source)}</dd>
        </div>
        <div>
          <dt>{t('scenarios.metricQuality')}</dt>
          <dd>{displayEnumLabel(locale, snapshot.quality)}</dd>
        </div>
      </dl>
      <div className="scenario-lamp-snapshot">
        <h3>{t('scenarios.lampSnapshotDetails')}</h3>
        <ul aria-label={t('scenarios.lampSnapshotDetails')}>
          {snapshot.lamps.map((lamp) => (
            <li key={lamp.lampId}>
              <strong>{lamp.lampId}</strong>
              <span>{displayEnumLabel(locale, lamp.operatingState)}</span>
              <span>{t('metrics.brightness', { value: lamp.brightnessPercent })}</span>
              <span>{displayEnumLabel(locale, lamp.health)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="scenario-no-electrical">{t('scenarios.electricalUnavailable')}</p>
    </section>
  );
}
