'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopologyAccessibleList } from './topology-accessible-list';
import { TopologyCanvas } from './topology-canvas';
import { TopologyDetailPanel } from './topology-detail-panel';
import { TopologyLegend } from './topology-legend';
import { StatusBadge } from '@/components/ui/status-badge';
import type { TopologyGraphModel } from '@/features/topology/topology-model';
import { applyTopologySelection, topologyDetail } from '@/features/topology/topology-selectors';

type TopologyDashboardProps = Readonly<{
  initialGraph: TopologyGraphModel;
  live?: boolean;
}>;

export function TopologyDashboard({ initialGraph, live = false }: TopologyDashboardProps) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const graph = useMemo(
    () => applyTopologySelection(initialGraph, selectedEntityId),
    [initialGraph, selectedEntityId],
  );
  const detail = topologyDetail(graph, graph.selectedEntityId);
  const clearSelection = useCallback(() => setSelectedEntityId(null), []);

  return (
    <div className="topology-dashboard">
      <header className="topology-header">
        <div>
          <p className="eyebrow">Interactive topology</p>
          <h1>System Topology</h1>
          <p>
            Controller, lamp, sensor ve deterministic relationship görünümü. Bu ekran production
            deployment şeması değildir.
          </p>
        </div>
        <div className="topology-header-meta">
          <StatusBadge
            label={live ? 'Backend Data' : 'Simulated Data'}
            tone={live ? 'ready' : 'neutral'}
          />
          <span>
            Snapshot: <time dateTime={graph.snapshotAt}>{graph.snapshotAtLabel}</time>
          </span>
        </div>
      </header>

      <div className="topology-workspace">
        <TopologyCanvas
          graph={graph}
          onSelect={setSelectedEntityId}
          onClearSelection={clearSelection}
        />
        <TopologyDetailPanel detail={detail} />
      </div>

      <TopologyLegend />
      <TopologyAccessibleList
        graph={graph}
        selectedEntityId={graph.selectedEntityId}
        onSelect={setSelectedEntityId}
      />
    </div>
  );
}
