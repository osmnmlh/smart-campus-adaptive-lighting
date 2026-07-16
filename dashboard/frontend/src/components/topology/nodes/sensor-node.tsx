import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TopologyFlowNode } from '@/features/topology/topology-model';

export function SensorNode({ data }: NodeProps<TopologyFlowNode>) {
  const { entity, onSelect } = data;
  if (entity.entityType !== 'sensor') return null;

  return (
    <div
      className="topology-node-shell"
      data-entity-type="sensor"
      data-status={entity.statusTone}
      data-selected={entity.selected}
      data-dimmed={entity.dimmed}
    >
      <button
        type="button"
        className="topology-node-button"
        onClick={() => onSelect(entity.id)}
        aria-pressed={entity.selected}
        aria-label={`${entity.label} sensor, ${entity.statusText}`}
      >
        <span className="topology-node-kicker">
          {entity.systemAmbient ? 'System ambient sensor' : 'Sensor'}
        </span>
        <strong>{entity.label}</strong>
        <span>{entity.statusText}</span>
        <small>
          {entity.dataSource} · {entity.metricQuality}
        </small>
      </button>
      <Handle type="source" position={Position.Bottom} className="topology-handle" />
    </div>
  );
}
