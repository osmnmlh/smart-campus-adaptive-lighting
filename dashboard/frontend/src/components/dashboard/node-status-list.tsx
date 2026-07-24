'use client';

import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';
import type { OverviewNode } from '@/features/overview/overview-model';

type NodeStatusListProps = Readonly<{
  nodes: readonly OverviewNode[];
}>;

export function NodeStatusList({ nodes }: NodeStatusListProps) {
  const { locale, t } = useLocalization();
  return (
    <SectionCard
      title={t('overview.nodeStatus')}
      description={t('overview.nodeStatusDescription')}
      titleId="node-status-title"
      ariaLabel={t('overview.nodeStatusAria')}
    >
      <div className="table-scroll" tabIndex={0} aria-label={t('overview.nodeTableAria')}>
        <table className="status-table">
          <thead>
            <tr>
              <th scope="col">{t('overview.node')}</th>
              <th scope="col">{t('overview.health')}</th>
              <th scope="col">{t('overview.communication')}</th>
              <th scope="col">{t('overview.controlledLamps')}</th>
              <th scope="col">{t('overview.lastUpdate')}</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.contractId}>
                <th scope="row">
                  <span className="entity-id">{node.id}</span>
                  <span className="entity-state">
                    {displayEnumLabel(locale, node.online ? 'ONLINE' : 'OFFLINE')}
                  </span>
                </th>
                <td>
                  <StatusBadge
                    label={displayEnumLabel(locale, node.health)}
                    tone={node.healthTone}
                  />
                </td>
                <td>
                  <StatusBadge
                    label={displayEnumLabel(locale, node.communicationHealth)}
                    tone={node.communicationTone}
                  />
                </td>
                <td>{node.lampIds.join(', ') || t('common.none')}</td>
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
