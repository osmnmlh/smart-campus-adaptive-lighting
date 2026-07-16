import type { TopologyDetailModel } from '@/features/topology/topology-model';
import { displayEntityId } from '@/features/overview/overview-selectors';

type TopologyDetailPanelProps = Readonly<{
  detail: TopologyDetailModel;
}>;

const labelFor = (entityId: string) => displayEntityId(entityId.split(':').at(-1) ?? entityId);

export function TopologyDetailPanel({ detail }: TopologyDetailPanelProps) {
  if (!detail) {
    return (
      <aside className="topology-detail-panel" aria-labelledby="topology-detail-title">
        <p className="eyebrow">Selection detail</p>
        <h2 id="topology-detail-title">Bir node, lamba veya sensör seçin</h2>
        <p>
          Canvas veya görünür Topology List üzerinden bir varlık seçerek ilişkilerini inceleyin.
        </p>
      </aside>
    );
  }

  return (
    <aside className="topology-detail-panel" aria-labelledby="topology-detail-title">
      <p className="eyebrow">Selection detail</p>
      <h2 id="topology-detail-title">{detail.label}</h2>
      <p className="topology-detail-status">{detail.statusText}</p>

      {detail.entityType === 'controller' ? (
        <dl className="topology-detail-list">
          <div>
            <dt>Entity type</dt>
            <dd>Controller node</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{detail.health}</dd>
          </div>
          <div>
            <dt>Communication health</dt>
            <dd>{detail.communicationHealth}</dd>
          </div>
          <div>
            <dt>Owned lamps</dt>
            <dd>{detail.ownedLampIds.map(labelFor).join(', ')}</dd>
          </div>
          <div>
            <dt>Snapshot time</dt>
            <dd>
              <time dateTime={detail.updatedAt}>{detail.updatedAtLabel}</time>
            </dd>
          </div>
        </dl>
      ) : null}

      {detail.entityType === 'lamp' ? (
        <dl className="topology-detail-list">
          <div>
            <dt>Operating state</dt>
            <dd>{detail.operatingState}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{detail.health}</dd>
          </div>
          <div>
            <dt>brightnessPercent</dt>
            <dd>{detail.brightnessPercent}%</dd>
          </div>
          <div>
            <dt>targetBrightnessPercent</dt>
            <dd>{detail.targetBrightnessPercent}%</dd>
          </div>
          <div>
            <dt>pwmDutyPercent</dt>
            <dd>{detail.pwmDutyPercent}%</dd>
          </div>
          <div>
            <dt>Owner node</dt>
            <dd>{labelFor(detail.ownerNodeId)}</dd>
          </div>
          <div>
            <dt>Neighbor lamps</dt>
            <dd>{detail.neighborLampIds.map(labelFor).join(', ') || 'None'}</dd>
          </div>
        </dl>
      ) : null}

      {detail.entityType === 'sensor' ? (
        <dl className="topology-detail-list">
          <div>
            <dt>Sensor type</dt>
            <dd>{detail.sensorType}</dd>
          </div>
          <div>
            <dt>Health</dt>
            <dd>{detail.health}</dd>
          </div>
          <div>
            <dt>Activity</dt>
            <dd>{detail.activityText}</dd>
          </div>
          <div>
            <dt>Data source</dt>
            <dd>{detail.dataSource}</dd>
          </div>
          <div>
            <dt>Metric quality</dt>
            <dd>{detail.metricQuality}</dd>
          </div>
          <div>
            <dt>Related segment</dt>
            <dd>
              {detail.relatedLampId ? labelFor(detail.relatedLampId) : 'System ambient sensor'}
            </dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}
