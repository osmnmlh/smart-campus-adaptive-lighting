'use client';

import { SummaryCard } from './summary-card';
import { SystemModeCard } from './system-mode-card';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';
import type { OverviewModel } from '@/features/overview/overview-model';

export function SummaryGrid({ model }: Readonly<{ model: OverviewModel }>) {
  const { summary } = model;
  const { locale, t } = useLocalization();
  return (
    <section className="summary-section" aria-labelledby="summary-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">{t('overview.systemOverview')}</p>
          <h2 id="summary-title">{t('overview.operationalSummary')}</h2>
        </div>
      </div>
      <div className="summary-grid">
        <SummaryCard
          label={t('overview.nodes')}
          value={summary.totalNodes}
          detail={t('overview.online', { count: summary.onlineNodes })}
          statusLabel={
            summary.offlineNodes === 0
              ? t('overview.allConnected')
              : t('overview.offline', { count: summary.offlineNodes })
          }
          tone={summary.offlineNodes === 0 ? 'ready' : 'warning'}
        />
        <SummaryCard
          label={t('overview.lamps')}
          value={summary.totalLamps}
          detail={t('overview.activePrelight', {
            active: summary.activeLamps,
            prelight: summary.preLightLamps,
          })}
          statusLabel={t('common.simulated')}
          tone="neutral"
        />
        <SummaryCard
          label={t('overview.activeAlerts')}
          value={summary.activeAlerts}
          detail={t('overview.highest', {
            severity: displayEnumLabel(locale, summary.highestAlertSeverity),
          })}
          statusLabel={t('overview.mockAlert')}
          tone={summary.activeAlerts > 0 ? 'warning' : 'ready'}
        />
        <SystemModeCard model={model} />
        <SummaryCard
          label={t('overview.dataSource')}
          value={displayEnumLabel(locale, model.dataSource)}
          detail={t('overview.fixture', { source: displayEnumLabel(locale, model.dataSource) })}
          statusLabel={t('overview.notLive')}
          tone="neutral"
        />
      </div>
    </section>
  );
}
