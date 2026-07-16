import { EchartsCanvas } from './echarts-canvas';
import { MetricChartCard } from './metric-chart-card';
import { buildAmbientLightChartOption } from '@/features/metrics/metrics-chart-options';
import type { MetricSeries } from '@/features/metrics/metrics-model';

export function AmbientLightChart({ series }: Readonly<{ series: MetricSeries }>) {
  return (
    <MetricChartCard
      title="Ambient light"
      description="BH1750 illuminance presentation without calibration or production claims."
      meta="SIMULATED · lx"
    >
      <EchartsCanvas
        option={buildAmbientLightChartOption(series)}
        ariaLabel="BH1750 simulated ambient light chart in lux"
        description="Ambient light values are non-negative and sourced from the deterministic simulated fixture."
      />
    </MetricChartCard>
  );
}
