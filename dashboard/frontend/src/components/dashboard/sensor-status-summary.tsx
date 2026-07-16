import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { OverviewSensor } from '@/features/overview/overview-model';

type SensorStatusSummaryProps = Readonly<{
  sensors: readonly OverviewSensor[];
}>;

export function SensorStatusSummary({ sensors }: SensorStatusSummaryProps) {
  return (
    <SectionCard
      title="Sensor status"
      description="Health and quality of the deterministic sensor fixture."
      titleId="sensor-status-title"
      ariaLabel="Sensor status summary"
    >
      <ul className="sensor-list" aria-label="Sensor status items">
        {sensors.map((sensor) => (
          <li key={sensor.contractId}>
            <div className="sensor-identity">
              <h3>{sensor.id}</h3>
              <span>{sensor.typeLabel}</span>
            </div>
            <dl className="sensor-details">
              <div>
                <dt>Health</dt>
                <dd>
                  <StatusBadge label={sensor.healthLabel} tone={sensor.healthTone} />
                </dd>
              </div>
              <div>
                <dt>Activity</dt>
                <dd>{sensor.activityLabel}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{sensor.dataSource}</dd>
              </div>
              <div>
                <dt>Quality</dt>
                <dd>{sensor.metricQuality}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
