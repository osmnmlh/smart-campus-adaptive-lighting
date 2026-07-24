'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopologyAccessibleList } from './topology-accessible-list';
import { TopologyCanvas } from './topology-canvas';
import { TopologyDetailPanel } from './topology-detail-panel';
import { TopologyLegend } from './topology-legend';
import { StatusBadge } from '@/components/ui/status-badge';
import { useLocalization } from '@/features/localization/use-localization';
import type { TopologyGraphModel } from '@/features/topology/topology-model';
import { applyTopologySelection, topologyDetail } from '@/features/topology/topology-selectors';

export function TopologyDashboard({
  initialGraph,
  live = false,
}: Readonly<{ initialGraph: TopologyGraphModel; live?: boolean }>) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const { t, formatDateTime } = useLocalization();
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
          <p className="eyebrow">{t('topology.eyebrow')}</p>
          <h1>{t('topology.title')}</h1>
          <p>{t('topology.subtitle')}</p>
        </div>
        <div className="topology-header-meta">
          <StatusBadge
            label={live ? t('common.backendData') : t('common.simulatedData')}
            tone={live ? 'ready' : 'neutral'}
          />
          <span>
            {t('common.snapshot')}:{' '}
            <time dateTime={graph.snapshotAt}>{formatDateTime(graph.snapshotAt)}</time>
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
