import type { TopologyGraphModel, TopologyNodeModel } from '@/features/topology/topology-model';
import { DisclosurePanel } from '@/components/ui/disclosure-panel';

type TopologyAccessibleListProps = Readonly<{
  graph: TopologyGraphModel;
  selectedEntityId: string | null;
  onSelect: (entityId: string) => void;
}>;

const sectionTitle: Record<TopologyNodeModel['entityType'], string> = {
  controller: 'Controllers',
  lamp: 'Lamps',
  sensor: 'Sensors',
};

export function TopologyAccessibleList({
  graph,
  selectedEntityId,
  onSelect,
}: TopologyAccessibleListProps) {
  return (
    <section className="topology-list" aria-labelledby="topology-list-title">
      <header>
        <p className="eyebrow">Accessible alternative</p>
        <h2 id="topology-list-title">Topology List</h2>
        <p>Canvas ile aynı selection state’ini paylaşan, keyboard-accessible sistem görünümü.</p>
      </header>
      <div className="topology-list-groups">
        {(['controller', 'lamp', 'sensor'] as const).map((entityType) => (
          <section key={entityType} aria-labelledby={`topology-list-${entityType}`}>
            <h3 id={`topology-list-${entityType}`}>{sectionTitle[entityType]}</h3>
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
                      <span>{node.statusText}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <DisclosurePanel
        title="Relationship details"
        description="Inspect communication, ownership, and sensing relationships."
        className="topology-relationships"
        contentClassName="topology-relationships__content"
        count={graph.edges.length + 1}
      >
        <h3>Relationships</h3>
        <ul>
          {graph.edges.map((edge) => (
            <li key={edge.id}>
              <strong>{edge.category}</strong>: {edge.source} → {edge.target} · {edge.label}
            </li>
          ))}
          <li>
            <strong>ambient</strong>: sensor:sensor-bh1750-1 · System ambient sensor
          </li>
        </ul>
      </DisclosurePanel>
    </section>
  );
}
