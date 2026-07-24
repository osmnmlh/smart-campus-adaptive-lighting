'use client';

import type { TopologyGraphModel, TopologyNodeModel } from '@/features/topology/topology-model';
import { DisclosurePanel } from '@/components/ui/disclosure-panel';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';
import type { TranslationKey } from '@/features/localization/messages';

type TopologyAccessibleListProps = Readonly<{
  graph: TopologyGraphModel;
  selectedEntityId: string | null;
  onSelect: (entityId: string) => void;
}>;

const sectionTitle: Record<TopologyNodeModel['entityType'], TranslationKey> = {
  controller: 'topology.controllers',
  lamp: 'topology.lamps',
  sensor: 'topology.sensors',
};

const relationshipLabel: Record<TopologyGraphModel['edges'][number]['category'], TranslationKey> = {
  communication: 'topology.communicationLink',
  ownership: 'topology.controlsLamp',
  sensing: 'topology.sensesSegment',
};

export function TopologyAccessibleList({
  graph,
  selectedEntityId,
  onSelect,
}: TopologyAccessibleListProps) {
  const { locale, t, formatNumber } = useLocalization();
  const statusFor = (node: TopologyNodeModel) => {
    if (node.entityType === 'controller') {
      return `${displayEnumLabel(locale, node.health)} · ${displayEnumLabel(locale, node.communicationHealth)}`;
    }
    if (node.entityType === 'lamp') {
      return `${displayEnumLabel(locale, node.operatingState)} · ${displayEnumLabel(locale, node.health)} · ${formatNumber(node.brightnessPercent)}%`;
    }
    return `${displayEnumLabel(locale, node.sensorType)} · ${node.active === null ? t('topology.systemAmbient') : displayEnumLabel(locale, node.active ? 'ACTIVE' : 'INACTIVE')} · ${displayEnumLabel(locale, node.health)}`;
  };

  return (
    <section className="topology-list" aria-labelledby="topology-list-title">
      <header>
        <p className="eyebrow">{t('topology.accessibleAlternative')}</p>
        <h2 id="topology-list-title">{t('topology.listTitle')}</h2>
        <p>{t('topology.listDescription')}</p>
      </header>
      <div className="topology-list-groups">
        {(['controller', 'lamp', 'sensor'] as const).map((entityType) => (
          <section key={entityType} aria-labelledby={`topology-list-${entityType}`}>
            <h3 id={`topology-list-${entityType}`}>{t(sectionTitle[entityType])}</h3>
            <ul>
              {graph.nodes
                .filter((node) => node.entityType === entityType)
                .map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(node.id)}
                      aria-pressed={selectedEntityId === node.id}
                    >
                      <strong>{node.label}</strong>
                      <span>{statusFor(node)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <DisclosurePanel
        title={t('topology.relationshipDetails')}
        description={t('topology.relationshipDescription')}
        className="topology-relationships"
        contentClassName="topology-relationships__content"
        count={graph.edges.length + 1}
      >
        <h3>{t('topology.relationships')}</h3>
        <ul>
          {graph.edges.map((edge) => (
            <li key={edge.id}>
              <strong>{t(`topology.${edge.category}`)}</strong>: {edge.source} → {edge.target} ·{' '}
              {t(relationshipLabel[edge.category])}
            </li>
          ))}
          <li>
            <strong>{t('topology.ambient')}</strong>: sensor:sensor-bh1750-1 ·{' '}
            {t('topology.systemAmbient')}
          </li>
        </ul>
      </DisclosurePanel>
    </section>
  );
}
