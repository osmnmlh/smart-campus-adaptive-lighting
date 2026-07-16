import { render, screen, within } from '@testing-library/react';
import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';
import { createOverviewModel } from '@/features/overview/overview-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

const model = createOverviewModel(overviewSnapshot);

describe('OverviewDashboard', () => {
  it('renders title, source notice, mode, and snapshot time', () => {
    render(<OverviewDashboard model={model} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Smart Campus Adaptive Lighting' }),
    ).toBeVisible();
    expect(screen.getByText('Mock Data')).toBeVisible();
    expect(screen.getByText(/Backend bağlantısı henüz aktif değil/i)).toBeVisible();
    expect(screen.getAllByText('AUTO_ADAPTIVE').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2026-06-15 20:30 UTC')).toHaveLength(4);
  });

  it('renders all summary and operational sections', () => {
    render(<OverviewDashboard model={model} />);

    expect(screen.getByRole('heading', { name: 'Operational summary' })).toBeVisible();
    expect(screen.getByLabelText('Nodes summary')).toHaveTextContent('3');
    expect(screen.getByLabelText('Lamps summary')).toHaveTextContent('1 active');
    expect(screen.getByLabelText('Sensors summary')).toHaveTextContent('6 healthy');
    expect(screen.getByLabelText('Active Alerts summary')).toHaveTextContent('WARNING');
    expect(screen.getByLabelText('Node status list')).toBeVisible();
    expect(screen.getByLabelText('Lamp status summary')).toBeVisible();
    expect(screen.getByLabelText('Sensor status summary')).toBeVisible();
    expect(screen.getByLabelText('Active alert summary')).toBeVisible();
  });

  it('shows five lamps with separate health, state, and percentage fields', () => {
    render(<OverviewDashboard model={model} />);
    const lamps = within(screen.getByLabelText('Lamp status summary'));

    expect(lamps.getAllByRole('listitem')).toHaveLength(5);
    expect(lamps.getByRole('heading', { name: 'L2' })).toBeVisible();
    expect(lamps.getByText('Active')).toBeVisible();
    expect(lamps.getAllByText('Healthy')).toHaveLength(5);
    expect(lamps.getAllByText('100%').length).toBeGreaterThanOrEqual(3);
    expect(lamps.getAllByText('Target brightness')).toHaveLength(5);
    expect(lamps.getAllByText('PWM duty percent')).toHaveLength(5);
    expect(lamps.queryByText(/^pwmDuty$/)).not.toBeInTheDocument();
  });

  it('shows six sensors without inventing a direction result for IR3', () => {
    render(<OverviewDashboard model={model} />);
    const sensors = within(screen.getByLabelText('Sensor status summary'));

    expect(sensors.getAllByRole('listitem')).toHaveLength(6);
    expect(sensors.getByRole('heading', { name: 'IR3' })).toBeVisible();
    expect(sensors.getByRole('heading', { name: 'BH1750' })).toBeVisible();
    expect(sensors.getAllByText('SIMULATED')).toHaveLength(6);
    expect(sensors.getAllByText('GOOD')).toHaveLength(6);
    expect(sensors.queryByText(/IR3.*direction|direction.*IR3/i)).not.toBeInTheDocument();
  });

  it('does not present fabricated energy, cost, or saving metrics', () => {
    render(<OverviewDashboard model={model} />);

    expect(screen.queryByText(/energy saving/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bkWh\b/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bcost\b|maliyet|karbon/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/watt/i)).not.toBeInTheDocument();
  });

  it('renders controlled empty and error states', () => {
    const { rerender } = render(<OverviewDashboard model={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('Overview is empty');
    expect(screen.queryByText(/Next\.js/i)).not.toBeInTheDocument();

    rerender(
      <OverviewDashboard
        model={null}
        errorMessage="Overview verisi güvenli biçimde hazırlanamadı."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Dashboard data could not be prepared');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Overview verisi güvenli biçimde hazırlanamadı.',
    );
    expect(screen.queryByText(/at createOverviewModel|stack trace/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});
