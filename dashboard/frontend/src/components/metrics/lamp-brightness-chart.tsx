import { EchartsCanvas } from './echarts-canvas';
import { MetricChartCard } from './metric-chart-card';
import { buildLampBrightnessChartOption } from '@/features/metrics/metrics-chart-options';
import type { MetricSeries } from '@/features/metrics/metrics-model';

type LampBrightnessChartProps = Readonly<{
  lampLabel: string;
  series: readonly MetricSeries[];
}>;

export function LampBrightnessChart({ lampLabel, series }: LampBrightnessChartProps) {
  const option = buildLampBrightnessChartOption(series);
  return (
    <MetricChartCard
      title="Lamp brightness, target and PWM"
      description={`${lampLabel} output percentages across the selected fixed time range.`}
      meta="SIMULATED · %"
      className="metric-chart-card-wide"
    >
      <EchartsCanvas
        option={option}
        ariaLabel={`${lampLabel} brightness, target brightness, and PWM duty percent chart`}
        description="Three deterministic series: Brightness, Target Brightness, and PWM Duty Percent (pwmDutyPercent). Invalid points are not connected."
      />
    </MetricChartCard>
  );
}
