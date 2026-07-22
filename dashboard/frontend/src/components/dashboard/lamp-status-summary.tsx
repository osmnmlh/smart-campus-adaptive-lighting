import type { DataSource } from '@smart-campus/contracts';
import { SectionCard } from '@/components/ui/section-card';
import { GaugeMeter } from '@/components/ui/gauge-meter';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewLamp } from '@/features/overview/overview-model';

type LampStatusSummaryProps = Readonly<{
  lamps: readonly OverviewLamp[];
  dataSource: DataSource;
  showGauge?: boolean;
}>;

export function LampStatusSummary({ lamps, dataSource, showGauge = true }: LampStatusSummaryProps) {
  return (
    <SectionCard
      title="Lamp status"
      description="Operating state, health, and simulated brightness controls."
      titleId="lamp-status-title"
      ariaLabel="Lamp status summary"
    >
      <ul className="entity-grid" aria-label="Lamp status items">
        {lamps.map((lamp) => (
          <li className="entity-card" key={lamp.contractId}>
            <div className="entity-card-header">
              <h3>{lamp.id}</h3>
              <StatusBadge label={lamp.operatingStateLabel} tone={lamp.operatingStateTone} />
            </div>
            {showGauge ? (
              <GaugeMeter
                value={lamp.brightnessPercent}
                max={100}
                label="Brightness"
                unit="%"
                tone={lamp.operatingStateTone}
                dataSource={dataSource}
                description={`${lamp.id} brightness percentage`}
              />
            ) : null}
            <dl className="compact-metrics">
              <div>
                <dt>Health</dt>
                <dd>
                  <StatusBadge label={lamp.healthLabel} tone={lamp.healthTone} />
                </dd>
              </div>
              <div>
                <dt>Target brightness</dt>
                <dd>{lamp.targetBrightnessPercent}%</dd>
              </div>
              <div>
                <dt>PWM duty percent</dt>
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
  return (
    <SectionCard
      title="Lamp brightness"
      description="Current simulated brightness for every campus lamp."
      titleId="lamp-brightness-title"
      ariaLabel="Lamp brightness summary"
    >
      <ul className="lamp-brightness-grid" aria-label="Lamp brightness items">
        {lamps.map((lamp) => (
          <li key={lamp.contractId}>
            <h3>{lamp.id}</h3>
            <GaugeMeter
              value={lamp.brightnessPercent}
              max={100}
              label="Brightness"
              unit="%"
              tone={lamp.operatingStateTone}
              dataSource={dataSource}
              description={`${lamp.id} brightness percentage`}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
