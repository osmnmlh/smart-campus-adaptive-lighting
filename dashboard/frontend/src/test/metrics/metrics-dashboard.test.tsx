import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EchartsCanvas } from '@/components/metrics/echarts-canvas';
import { MetricsDashboard } from '@/components/metrics/metrics-dashboard';
import { createMetricsDashboardState } from '@/features/metrics/metrics-adapter';
import { metricsTelemetryFixture } from '@/features/metrics/metrics-fixture';

const chartMocks = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  init: vi.fn(),
}));

vi.mock('echarts', () => ({
  init: chartMocks.init.mockImplementation(() => ({
    setOption: chartMocks.setOption,
    resize: chartMocks.resize,
    dispose: chartMocks.dispose,
  })),
}));

const readyState = createMetricsDashboardState(metricsTelemetryFixture);

afterEach(() => {
  vi.clearAllMocks();
});

describe('MetricsDashboard', () => {
  it('renders the required dashboard regions and controls', () => {
    render(<MetricsDashboard initialState={readyState} />);
    expect(screen.getByRole('heading', { name: 'System Metrics' })).toBeVisible();
    expect(screen.getByText('Simulated Data')).toBeVisible();
    expect(screen.getByLabelText('Lamp')).toHaveValue('lamp-2');
    expect(screen.getByLabelText('IR sensor')).toHaveValue('sensor-ir-2');
    expect(screen.getByRole('button', { name: '5 min' })).toBeVisible();
    expect(screen.getByRole('button', { name: '15 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '60 min' })).toBeVisible();
  });

  it('renders all chart sections with accessible descriptions', () => {
    render(<MetricsDashboard initialState={readyState} />);
    expect(screen.getByRole('heading', { name: 'Lamp brightness, target and PWM' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Ambient light' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Sensor activity timeline' })).toBeVisible();
    expect(
      screen.getByRole('img', {
        name: 'L2 brightness, target brightness, and PWM duty percent chart',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'BH1750 simulated ambient light chart in lux' }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'IR2 simulated active and inactive state timeline' }),
    ).toBeVisible();
  });

  it('renders quality, communication, table, and unavailable states', () => {
    render(<MetricsDashboard initialState={readyState} />);
    expect(screen.getByRole('heading', { name: 'Metric quality summary' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Communication status' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Electrical metrics not available' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Metric data table' })).toBeVisible();
    expect(screen.getByText('NODE_1')).toBeVisible();
    expect(screen.getByText('NODE_2')).toBeVisible();
    expect(screen.getByText('NODE_3')).toBeVisible();
  });

  it('changes the selected lamp chart model', () => {
    render(<MetricsDashboard initialState={readyState} />);
    fireEvent.change(screen.getByLabelText('Lamp'), { target: { value: 'lamp-3' } });
    expect(screen.getByLabelText('Lamp')).toHaveValue('lamp-3');
    expect(
      screen.getByRole('img', {
        name: 'L3 brightness, target brightness, and PWM duty percent chart',
      }),
    ).toBeVisible();
  });

  it('changes the selected sensor without claiming direction', () => {
    render(<MetricsDashboard initialState={readyState} />);
    fireEvent.change(screen.getByLabelText('IR sensor'), {
      target: { value: 'sensor-ir-3' },
    });
    expect(screen.getByLabelText('IR sensor')).toHaveValue('sensor-ir-3');
    expect(
      screen.getByRole('img', { name: 'IR3 simulated active and inactive state timeline' }),
    ).toBeVisible();
    expect(screen.queryByText(/IR3 direction/i)).not.toBeInTheDocument();
  });

  it('changes the visible point count for fixed time ranges', () => {
    render(<MetricsDashboard initialState={readyState} />);
    expect(screen.getAllByRole('row')).toHaveLength(37);
    fireEvent.click(screen.getByRole('button', { name: '5 min' }));
    expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '15 min' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('row')).toHaveLength(31);
    expect(screen.getByText(/lamp-2, sensor-ir-2, 5m simulated metric points/i)).toBeVisible();
  });

  it('does not present invented live or sustainability claims', () => {
    render(<MetricsDashboard initialState={readyState} />);
    expect(screen.queryByText('Connected live')).not.toBeInTheDocument();
    expect(screen.queryByText(/energy saving/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kWh/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cost saving/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/carbon reduction/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('renders a safe invalid state without a stack trace', () => {
    render(
      <MetricsDashboard
        initialState={{ status: 'invalid', model: null, message: 'Safe invalid metric data.' }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Metrics unavailable' })).toBeVisible();
    expect(screen.getByText('Safe invalid metric data.')).toBeVisible();
    expect(screen.getByText(/No network retry or automatic refresh/i)).toBeVisible();
    expect(screen.queryByText(/at MetricsDashboard/)).not.toBeInTheDocument();
  });

  it('renders a safe empty state', () => {
    render(
      <MetricsDashboard
        initialState={{
          status: 'empty',
          model: readyState.model,
          message: 'No simulated metric points are available.',
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'No metric series available' })).toBeVisible();
    expect(screen.getByText('No simulated metric points are available.')).toBeVisible();
  });

  it('initializes once and disposes the ECharts instance on unmount', async () => {
    const { unmount } = render(
      <EchartsCanvas
        option={{ animation: false }}
        ariaLabel="Lifecycle chart"
        description="Lifecycle description"
      />,
    );
    await waitFor(() => expect(chartMocks.init).toHaveBeenCalledTimes(1));
    expect(chartMocks.setOption).toHaveBeenCalled();
    expect(screen.getByRole('img', { name: 'Lifecycle chart' })).toBeVisible();
    unmount();
    expect(chartMocks.dispose).toHaveBeenCalledTimes(1);
  });
});
