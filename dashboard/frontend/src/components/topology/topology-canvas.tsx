'use client';

import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { useMemo } from 'react';
import { LampNode } from './nodes/lamp-node';
import { SensorNode } from './nodes/sensor-node';
import { TopologyNode } from './nodes/topology-node';
import { TopologyToolbar } from './topology-toolbar';
import type {
  TopologyFlowEdge,
  TopologyFlowNode,
  TopologyGraphModel,
} from '@/features/topology/topology-model';
import { topologyEdgeMarkers, topologyEdgeStyle } from '@/features/topology/topology-styles';

const nodeTypes = {
  controller: TopologyNode,
  lamp: LampNode,
  sensor: SensorNode,
} satisfies NodeTypes;

type TopologyCanvasProps = Readonly<{
  graph: TopologyGraphModel;
  onSelect: (entityId: string) => void;
  onClearSelection: () => void;
}>;

function TopologyCanvasInner({ graph, onSelect, onClearSelection }: TopologyCanvasProps) {
  const { fitView, setViewport } = useReactFlow<TopologyFlowNode, TopologyFlowEdge>();

  const nodes = useMemo<readonly TopologyFlowNode[]>(
    () =>
      graph.nodes.map((entity) => ({
        id: entity.id,
        type: entity.entityType,
        position: { ...entity.position },
        data: { entity, onSelect },
        draggable: false,
        selectable: false,
      })),
    [graph.nodes, onSelect],
  );

  const edges = useMemo<readonly TopologyFlowEdge[]>(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        type: 'smoothstep',
        source: edge.source,
        target: edge.target,
        label: edge.label,
        data: { category: edge.category },
        animated: false,
        selectable: false,
        className: `topology-edge topology-edge-${edge.category}${edge.dimmed ? ' is-dimmed' : ''}`,
        style: topologyEdgeStyle(edge),
        ...topologyEdgeMarkers(edge),
      })),
    [graph.edges],
  );

  const handleFitView = () => {
    void fitView({ padding: 0.14, duration: 0 });
  };

  const handleResetView = () => {
    onClearSelection();
    void setViewport({ x: 0, y: 0, zoom: 0.72 }, { duration: 0 });
  };

  return (
    <div className="topology-canvas-shell">
      <TopologyToolbar
        onFitView={handleFitView}
        onResetView={handleResetView}
        onClearSelection={onClearSelection}
        clearSelectionDisabled={graph.selectedEntityId === null}
      />
      <div className="topology-canvas" aria-label="Interactive system topology canvas">
        <ReactFlow<TopologyFlowNode, TopologyFlowEdge>
          nodes={[...nodes]}
          edges={[...edges]}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.35}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable={false}
          onPaneClick={onClearSelection}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#cbd6dc" />
        </ReactFlow>
      </div>
    </div>
  );
}

export function TopologyCanvas(props: TopologyCanvasProps) {
  return (
    <ReactFlowProvider>
      <TopologyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
