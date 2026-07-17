import { EchartsCanvas } from './echarts-canvas';
import { MetricChartCard } from './metric-chart-card';
import { buildSensorActivityChartOption } from '@/features/metrics/metrics-chart-options';
import type { MetricSeries } from '@/features/metrics/metrics-model';

type SensorActivityChartProps = Readonly<{
  sensorLabel: string;
  series: MetricSeries | null;
}>;

export function SensorActivityChart({ sensorLabel, series }: SensorActivityChartProps) {
  return (
    <MetricChartCard
      title="Sensor activity timeline"
      description={`${sensorLabel} motion state only; no direction, speed, or classification inference.`}
      meta="0 Inactive · 1 Active"
    >
      <EchartsCanvas
        option={buildSensorActivityChartOption(series)}
        ariaLabel={`${sensorLabel} simulated active and inactive state timeline`}
        description="Step line where zero means Inactive and one means Active."
      />
    </MetricChartCard>
  );
}
