import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TopologyFlowNode } from '@/features/topology/topology-model';

export function TopologyNode({ data }: NodeProps<TopologyFlowNode>) {
  const { entity, onSelect } = data;
  if (entity.entityType !== 'controller') return null;

  return (
    <div
      className="topology-node-shell"
      data-entity-type="controller"
      data-selected={entity.selected}
      data-dimmed={entity.dimmed}
    >
      <Handle type="target" position={Position.Top} className="topology-handle" />
      <button
        type="button"
        className="topology-node-button"
        onClick={() => onSelect(entity.id)}
        aria-pressed={entity.selected}
        aria-label={`${entity.label} controller node, ${entity.statusText}`}
      >
        <span className="topology-node-kicker">Controller node</span>
        <strong>{entity.label}</strong>
        <span>{entity.statusText}</span>
        <small>{entity.ownedLampIds.length} owned lamps</small>
      </button>
      <Handle type="source" position={Position.Top} className="topology-handle" />
    </div>
  );
}
