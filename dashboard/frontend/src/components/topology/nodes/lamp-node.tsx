import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TopologyFlowNode } from '@/features/topology/topology-model';

export function LampNode({ data }: NodeProps<TopologyFlowNode>) {
  const { entity, onSelect } = data;
  if (entity.entityType !== 'lamp') return null;

  return (
    <div
      className="topology-node-shell"
      data-entity-type="lamp"
      data-status={entity.statusTone}
      data-selected={entity.selected}
      data-dimmed={entity.dimmed}
    >
      <Handle type="target" position={Position.Bottom} className="topology-handle" />
      <button
        type="button"
        className="topology-node-button"
        onClick={() => onSelect(entity.id)}
        aria-pressed={entity.selected}
        aria-label={`${entity.label} lamp, ${entity.statusText}`}
      >
        <span className="topology-node-kicker">Lamp</span>
        <strong>{entity.label}</strong>
        <span>{entity.statusText}</span>
        <small>Brightness {entity.brightnessPercent}%</small>
      </button>
      <Handle type="target" position={Position.Top} className="topology-handle" />
    </div>
  );
}
