import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewLamp } from '@/features/overview/overview-model';

type LampStatusSummaryProps = Readonly<{
  lamps: readonly OverviewLamp[];
}>;

export function LampStatusSummary({ lamps }: LampStatusSummaryProps) {
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
            <dl className="compact-metrics">
              <div>
                <dt>Health</dt>
                <dd>
                  <StatusBadge label={lamp.healthLabel} tone={lamp.healthTone} />
                </dd>
              </div>
              <div>
                <dt>Brightness</dt>
                <dd>{lamp.brightnessPercent}%</dd>
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
