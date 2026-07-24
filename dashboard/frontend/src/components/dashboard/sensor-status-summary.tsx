'use client';

import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewSensor } from '@/features/overview/overview-model';
import { displayEnumLabel } from '@/features/localization/display-labels';
import { useLocalization } from '@/features/localization/use-localization';

type SensorStatusSummaryProps = Readonly<{
  sensors: readonly OverviewSensor[];
}>;

export function SensorStatusSummary({ sensors }: SensorStatusSummaryProps) {
  const { locale, t } = useLocalization();
  return (
    <SectionCard
      title={t('overview.sensorStatus')}
      description={t('overview.sensorStatusDescription')}
      titleId="sensor-status-title"
      ariaLabel={t('overview.sensorStatusAria')}
    >
      <ul className="sensor-list" aria-label={t('overview.sensorItemsAria')}>
        {sensors.map((sensor) => (
          <li key={sensor.contractId}>
            <div className="sensor-identity">
              <h3>{sensor.id}</h3>
              <span>{displayEnumLabel(locale, sensor.type)}</span>
            </div>
            <dl className="sensor-details">
              <div>
                <dt>{t('overview.health')}</dt>
                <dd>
                  <StatusBadge
                    label={displayEnumLabel(locale, sensor.health)}
                    tone={sensor.healthTone}
                  />
                </dd>
              </div>
              <div>
                <dt>{t('overview.activity')}</dt>
                <dd>
                  {sensor.active === null
                    ? t('topology.systemAmbient')
                    : displayEnumLabel(locale, sensor.active ? 'ACTIVE' : 'INACTIVE')}
                </dd>
              </div>
              <div>
                <dt>{t('overview.source')}</dt>
                <dd>{displayEnumLabel(locale, sensor.dataSource)}</dd>
              </div>
              <div>
                <dt>{t('overview.quality')}</dt>
                <dd>{displayEnumLabel(locale, sensor.metricQuality)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
