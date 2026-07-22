import type { ScenarioSnapshotPreview as Snapshot } from '@/features/scenarios/scenario-model';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';

const lifecycleTone: Record<Snapshot['lifecycle'], StatusTone> = {
  IDLE: 'neutral',
  READY: 'ready',
  RUNNING: 'ready',
  PAUSED: 'warning',
  COMPLETED: 'neutral',
  ERROR: 'critical',
};

export function ScenarioSnapshotPreview({ snapshot }: Readonly<{ snapshot: Snapshot | null }>) {
  if (snapshot === null) {
    return (
      <section className="scenario-snapshot-card" aria-labelledby="scenario-snapshot-title">
        <header>
          <div>
            <p className="eyebrow">Read-only local projection</p>
            <h2 id="scenario-snapshot-title">Snapshot preview</h2>
          </div>
          <StatusBadge label="UNAVAILABLE" tone="neutral" />
        </header>
        <p className="scenario-empty-list">
          Select a simulated scenario to create its deterministic starting snapshot.
        </p>
      </section>
    );
  }

  return (
    <section className="scenario-snapshot-card" aria-labelledby="scenario-snapshot-title">
      <header>
        <div>
          <p className="eyebrow">Read-only local projection</p>
          <h2 id="scenario-snapshot-title">Snapshot preview</h2>
        </div>
        <StatusBadge label={snapshot.lifecycle} tone={lifecycleTone[snapshot.lifecycle]} />
      </header>
      <dl className="scenario-snapshot-grid">
        <div>
          <dt>System mode</dt>
          <dd>{snapshot.systemMode}</dd>
        </div>
        <div>
          <dt>Virtual timestamp</dt>
          <dd>{snapshot.virtualTimestamp}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{snapshot.direction}</dd>
        </div>
        <div>
          <dt>Active nodes</dt>
          <dd>
            {snapshot.activeNodeCount} / {snapshot.totalNodeCount}
          </dd>
        </div>
        <div>
          <dt>Active lamps</dt>
          <dd>{snapshot.activeLampCount}</dd>
        </div>
        <div>
          <dt>Pre-light lamps</dt>
          <dd>{snapshot.preLightLampCount}</dd>
        </div>
        <div>
          <dt>Standby lamps</dt>
          <dd>{snapshot.standbyLampCount}</dd>
        </div>
        <div>
          <dt>Off lamps</dt>
          <dd>{snapshot.offLampCount}</dd>
        </div>
        <div>
          <dt>Total lamps</dt>
          <dd>{snapshot.totalLampCount}</dd>
        </div>
        <div>
          <dt>Active sensors</dt>
          <dd>
            {snapshot.activeSensorCount} / {snapshot.totalSensorCount}
          </dd>
        </div>
        <div className="scenario-sensor-ids">
          <dt>Active sensor IDs</dt>
          <dd>
            {snapshot.activeSensorIds.length === 0 ? 'None' : snapshot.activeSensorIds.join(', ')}
          </dd>
        </div>
        <div className="scenario-sensor-ids">
          <dt>Offline node IDs</dt>
          <dd>
            {snapshot.offlineNodeIds.length === 0 ? 'None' : snapshot.offlineNodeIds.join(', ')}
          </dd>
        </div>
        <div>
          <dt>Active alerts</dt>
          <dd>{snapshot.activeAlertCount}</dd>
        </div>
        <div>
          <dt>Data source</dt>
          <dd>{snapshot.source}</dd>
        </div>
        <div>
          <dt>Metric quality</dt>
          <dd>{snapshot.quality}</dd>
        </div>
      </dl>
      <div className="scenario-lamp-snapshot">
        <h3>Lamp snapshot details</h3>
        <ul aria-label="Lamp snapshot details">
          {snapshot.lamps.map((lamp) => (
            <li key={lamp.lampId}>
              <strong>{lamp.lampId}</strong>
              <span>{lamp.operatingState}</span>
              <span>{lamp.brightnessPercent}% brightness</span>
              <span>{lamp.health}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="scenario-no-electrical">
        Electrical metrics are not available in this presentation simulation.
      </p>
    </section>
  );
}
