'use client';

import type { TopologyDetailModel } from '@/features/topology/topology-model';
import { displayEntityId } from '@/features/overview/overview-selectors';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type TopologyDetailPanelProps = Readonly<{
  detail: TopologyDetailModel;
}>;

const labelFor = (entityId: string) => displayEntityId(entityId.split(':').at(-1) ?? entityId);

export function TopologyDetailPanel({ detail }: TopologyDetailPanelProps) {
  const { locale, t, formatDateTime, formatNumber } = useLocalization();
  const enumLabel = (value: string) => displayEnumLabel(locale, value);

  if (!detail) {
    return (
      <aside className="topology-detail-panel" aria-labelledby="topology-detail-title">
        <p className="eyebrow">{t('topology.selectionDetail')}</p>
        <h2 id="topology-detail-title">{t('topology.choose')}</h2>
        <p>{t('topology.chooseDescription')}</p>
      </aside>
    );
  }

  const statusText =
    detail.entityType === 'controller'
      ? `${enumLabel(detail.health)} · ${t('topology.communicationHealth')} ${enumLabel(detail.communicationHealth)}`
      : detail.entityType === 'lamp'
        ? `${enumLabel(detail.operatingState)} · ${enumLabel(detail.health)} · ${formatNumber(detail.brightnessPercent)}%`
        : `${enumLabel(detail.sensorType)} · ${detail.active === null ? t('topology.systemAmbient') : enumLabel(detail.active ? 'ACTIVE' : 'INACTIVE')} · ${enumLabel(detail.health)}`;

  return (
    <aside className="topology-detail-panel" aria-labelledby="topology-detail-title">
      <p className="eyebrow">{t('topology.selectionDetail')}</p>
      <h2 id="topology-detail-title">{detail.label}</h2>
      <p className="topology-detail-status">{statusText}</p>

      {detail.entityType === 'controller' ? (
        <dl className="topology-detail-list">
          <div>
            <dt>{t('topology.entityType')}</dt>
            <dd>{t('topology.controllerNode')}</dd>
          </div>
          <div>
            <dt>{t('topology.health')}</dt>
            <dd>{enumLabel(detail.health)}</dd>
          </div>
          <div>
            <dt>{t('topology.communicationHealth')}</dt>
            <dd>{enumLabel(detail.communicationHealth)}</dd>
          </div>
          <div>
            <dt>{t('topology.ownedLamps')}</dt>
            <dd>{detail.ownedLampIds.map(labelFor).join(', ')}</dd>
          </div>
          <div>
            <dt>{t('topology.snapshotTime')}</dt>
            <dd>
              <time dateTime={detail.updatedAt}>{formatDateTime(detail.updatedAt)}</time>
            </dd>
          </div>
        </dl>
      ) : null}

      {detail.entityType === 'lamp' ? (
        <dl className="topology-detail-list">
          <div>
            <dt>{t('topology.operatingState')}</dt>
            <dd>{enumLabel(detail.operatingState)}</dd>
          </div>
          <div>
            <dt>{t('topology.health')}</dt>
            <dd>{enumLabel(detail.health)}</dd>
          </div>
          <div>
            <dt>{t('topology.brightness')}</dt>
            <dd>{formatNumber(detail.brightnessPercent)}%</dd>
          </div>
          <div>
            <dt>{t('topology.targetBrightness')}</dt>
            <dd>{formatNumber(detail.targetBrightnessPercent)}%</dd>
          </div>
          <div>
            <dt>{t('topology.pwmDuty')}</dt>
            <dd>{formatNumber(detail.pwmDutyPercent)}%</dd>
          </div>
          <div>
            <dt>{t('topology.ownerNode')}</dt>
            <dd>{labelFor(detail.ownerNodeId)}</dd>
          </div>
          <div>
            <dt>{t('topology.neighborLamps')}</dt>
            <dd>{detail.neighborLampIds.map(labelFor).join(', ') || t('common.none')}</dd>
          </div>
        </dl>
      ) : null}

      {detail.entityType === 'sensor' ? (
        <dl className="topology-detail-list">
          <div>
            <dt>{t('topology.sensorType')}</dt>
            <dd>{enumLabel(detail.sensorType)}</dd>
          </div>
          <div>
            <dt>{t('topology.health')}</dt>
            <dd>{enumLabel(detail.health)}</dd>
          </div>
          <div>
            <dt>{t('topology.activity')}</dt>
            <dd>
              {detail.active === null
                ? t('topology.systemAmbient')
                : enumLabel(detail.active ? 'ACTIVE' : 'INACTIVE')}
            </dd>
          </div>
          <div>
            <dt>{t('topology.dataSource')}</dt>
            <dd>{enumLabel(detail.dataSource)}</dd>
          </div>
          <div>
            <dt>{t('topology.metricQuality')}</dt>
            <dd>{enumLabel(detail.metricQuality)}</dd>
          </div>
          <div>
            <dt>{t('topology.relatedSegment')}</dt>
            <dd>
              {detail.relatedLampId ? labelFor(detail.relatedLampId) : t('topology.systemAmbient')}
            </dd>
          </div>
        </dl>
      ) : null}
    </aside>
  );
}
