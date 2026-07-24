'use client';

import type { DataSource } from '@smart-campus/contracts';
import { SectionCard } from '@/components/ui/section-card';
import { GaugeMeter } from '@/components/ui/gauge-meter';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewLamp } from '@/features/overview/overview-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type LampStatusSummaryProps = Readonly<{
  lamps: readonly OverviewLamp[];
  dataSource: DataSource;
  showGauge?: boolean;
}>;

export function LampStatusSummary({ lamps, dataSource, showGauge = true }: LampStatusSummaryProps) {
  const { locale, t } = useLocalization();
  return (
    <SectionCard
      title={t('overview.lampStatus')}
      description={t('overview.lampStatusDescription')}
      titleId="lamp-status-title"
      ariaLabel={t('overview.lampStatusAria')}
    >
      <ul className="entity-grid" aria-label={t('overview.lampItemsAria')}>
        {lamps.map((lamp) => (
          <li className="entity-card" key={lamp.contractId}>
            <div className="entity-card-header">
              <h3>{lamp.id}</h3>
              <StatusBadge
                label={displayEnumLabel(locale, lamp.operatingState)}
                tone={lamp.operatingStateTone}
              />
            </div>
            {showGauge ? (
              <GaugeMeter
                value={lamp.brightnessPercent}
                max={100}
                label={t('overview.brightness')}
                unit="%"
                tone={lamp.operatingStateTone}
                dataSource={dataSource}
                description={t('overview.brightnessDescription', { id: lamp.id })}
              />
            ) : null}
            <dl className="compact-metrics">
              <div>
                <dt>{t('overview.health')}</dt>
                <dd>
                  <StatusBadge
                    label={displayEnumLabel(locale, lamp.health)}
                    tone={lamp.healthTone}
                  />
                </dd>
              </div>
              <div>
                <dt>{t('overview.targetBrightness')}</dt>
                <dd>{lamp.targetBrightnessPercent}%</dd>
              </div>
              <div>
                <dt>{t('overview.pwmDuty')}</dt>
                <dd>{lamp.pwmDutyPercent}%</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function LampBrightnessSummary({ lamps, dataSource }: LampStatusSummaryProps) {
  const { t } = useLocalization();
  return (
    <SectionCard
      title={t('overview.lampBrightness')}
      description={t('overview.lampBrightnessDescription')}
      titleId="lamp-brightness-title"
      ariaLabel={t('overview.lampBrightnessAria')}
    >
      <ul className="lamp-brightness-grid" aria-label={t('overview.lampBrightnessItemsAria')}>
        {lamps.map((lamp) => (
          <li key={lamp.contractId}>
            <h3>{lamp.id}</h3>
            <GaugeMeter
              value={lamp.brightnessPercent}
              max={100}
              label={t('overview.brightness')}
              unit="%"
              tone={lamp.operatingStateTone}
              dataSource={dataSource}
              description={t('overview.brightnessDescription', { id: lamp.id })}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
