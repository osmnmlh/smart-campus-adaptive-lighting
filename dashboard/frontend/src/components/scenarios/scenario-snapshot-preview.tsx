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

export function ScenarioSnapshotPreview({ snapshot }: Readonly<{ snapshot: Snapshot }>) {
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
          <dt>Timestamp</dt>
          <dd>{snapshot.snapshotAt}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{snapshot.direction}</dd>
        </div>
        <div>
          <dt>Nodes</dt>
          <dd>
            {snapshot.onlineNodeCount} / {snapshot.nodeCount} online
          </dd>
        </div>
        <div>
          <dt>Lamps</dt>
          <dd>
            {snapshot.activeLampCount} / {snapshot.lampCount} active
          </dd>
        </div>
        <div>
          <dt>Sensors</dt>
          <dd>
            {snapshot.activeSensorCount} / {snapshot.sensorCount} active
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
      <p className="scenario-no-electrical">
        Electrical metrics are not available in this presentation simulation.
      </p>
    </section>
  );
}
