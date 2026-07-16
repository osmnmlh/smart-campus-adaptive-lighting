import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewNode } from '@/features/overview/overview-model';

type NodeStatusListProps = Readonly<{
  nodes: readonly OverviewNode[];
}>;

export function NodeStatusList({ nodes }: NodeStatusListProps) {
  return (
    <SectionCard
      title="Node status"
      description="Connectivity and lamp ownership by control node."
      titleId="node-status-title"
      ariaLabel="Node status list"
    >
      <div className="table-scroll" tabIndex={0} aria-label="Scrollable node status table">
        <table className="status-table">
          <thead>
            <tr>
              <th scope="col">Node</th>
              <th scope="col">Health</th>
              <th scope="col">Communication</th>
              <th scope="col">Controlled lamps</th>
              <th scope="col">Last update</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.contractId}>
                <th scope="row">
                  <span className="entity-id">{node.id}</span>
                  <span className="entity-state">{node.online ? 'Online' : 'Offline'}</span>
                </th>
                <td>
                  <StatusBadge label={node.healthLabel} tone={node.healthTone} />
                </td>
                <td>
                  <StatusBadge label={node.communicationLabel} tone={node.communicationTone} />
                </td>
                <td>{node.lampIds.join(', ') || 'None'}</td>
                <td>
                  <time dateTime={node.updatedAt}>{node.updatedAtLabel}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
