import { MarkerType, type EdgeMarker } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { TopologyEdgeCategory, TopologyEdgeModel } from './topology-model';

const edgeStyles: Record<TopologyEdgeCategory, CSSProperties> = {
  communication: { stroke: '#24445d', strokeWidth: 2 },
  ownership: { stroke: '#087c78', strokeWidth: 2 },
  sensing: { stroke: '#8a5200', strokeWidth: 1.7, strokeDasharray: '6 4' },
};

const marker = (color: string): EdgeMarker => ({
  type: MarkerType.ArrowClosed,
  color,
  width: 14,
  height: 14,
});

export function topologyEdgeStyle(edge: TopologyEdgeModel): CSSProperties {
  return {
    ...edgeStyles[edge.category],
    opacity: edge.dimmed ? 0.18 : 1,
  };
}

export function topologyEdgeMarkers(edge: TopologyEdgeModel): Readonly<{
  markerStart?: EdgeMarker;
  markerEnd: EdgeMarker;
}> {
  const color =
    edge.category === 'communication'
      ? '#24445d'
      : edge.category === 'ownership'
        ? '#087c78'
        : '#8a5200';
  return {
    ...(edge.bidirectional ? { markerStart: marker(color) } : {}),
    markerEnd: marker(color),
  };
}
