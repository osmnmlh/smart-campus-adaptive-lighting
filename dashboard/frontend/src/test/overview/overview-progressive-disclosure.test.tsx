import { fireEvent, render, screen, within } from '@testing-library/react';
import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';
import { createOverviewModel } from '@/features/overview/overview-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

const model = createOverviewModel(overviewSnapshot);

const openDetails = (title: string) => {
  const details = screen.getByText(title).closest('details');
  if (!details) throw new Error(`${title} details missing`);
  fireEvent.click(within(details).getByText(title).closest('summary')!);
  return details;
};

describe('Overview progressive disclosure', () => {
  it('keeps the operational summary to five primary cards', () => {
    render(<OverviewDashboard model={model} />);
    const summary = screen
      .getByRole('heading', { name: 'Operational summary' })
      .closest('section')!;
    expect(within(summary).getAllByRole('article')).toHaveLength(5);
    expect(within(summary).queryByLabelText('Sensors summary')).not.toBeInTheDocument();
  });

  it('keeps system mode visible while technical details are closed', () => {
    render(<OverviewDashboard model={model} />);
    expect(screen.getByLabelText('System Mode summary')).toHaveTextContent('AUTO_ADAPTIVE');
  });

  it('keeps online node health visible in the primary summary', () => {
    render(<OverviewDashboard model={model} />);
    expect(screen.getByLabelText('Nodes summary')).toHaveTextContent('3 online');
    expect(screen.getByLabelText('Nodes summary')).toHaveTextContent('All connected');
  });

  it('keeps active alert severity visible outside disclosures', () => {
    render(<OverviewDashboard model={model} />);
    expect(screen.getByLabelText('Active Alerts summary')).toHaveTextContent('WARNING');
    expect(screen.getByLabelText('Active alert summary')).toBeVisible();
  });

  it('keeps simulated provenance and latest snapshot context visible', () => {
    render(<OverviewDashboard model={model} />);
    expect(screen.getByLabelText('Data source notice')).toHaveTextContent('SIMULATED');
    expect(screen.getAllByText('2026-06-15 20:30 UTC').length).toBeGreaterThan(0);
  });

  it('starts both technical detail groups closed', () => {
    render(<OverviewDashboard model={model} />);
    expect(screen.getByText('Infrastructure details').closest('details')).not.toHaveAttribute(
      'open',
    );
    expect(screen.getByText('Lighting and sensor details').closest('details')).not.toHaveAttribute(
      'open',
    );
  });

  it('reveals all node rows after opening infrastructure details', () => {
    render(<OverviewDashboard model={model} />);
    openDetails('Infrastructure details');
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('NODE_3')).toBeVisible();
  });

  it('preserves communication and lamp ownership details', () => {
    render(<OverviewDashboard model={model} />);
    openDetails('Infrastructure details');
    expect(screen.getByRole('columnheader', { name: 'Communication' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Controlled lamps' })).toBeVisible();
  });

  it('reveals the existing five-lamp technical breakdown', () => {
    render(<OverviewDashboard model={model} />);
    openDetails('Lighting and sensor details');
    expect(
      within(screen.getByLabelText('Lamp status summary')).getAllByRole('listitem'),
    ).toHaveLength(5);
    expect(screen.getAllByText('PWM duty percent')).toHaveLength(5);
  });

  it('reveals the existing six-sensor technical breakdown', () => {
    render(<OverviewDashboard model={model} />);
    openDetails('Lighting and sensor details');
    const sensors = within(screen.getByLabelText('Sensor status summary'));
    expect(sensors.getAllByRole('listitem')).toHaveLength(6);
    expect(sensors.getByRole('heading', { name: 'BH1750' })).toBeVisible();
  });

  it('keeps all five GaugeMeters visible before opening technical details', () => {
    render(<OverviewDashboard model={model} />);
    const brightness = within(screen.getByLabelText('Lamp brightness summary'));
    expect(brightness.getAllByRole('meter')).toHaveLength(5);
    expect(brightness.getAllByText('Source: SIMULATED')).toHaveLength(5);
  });

  it('does not duplicate GaugeMeters inside the technical disclosure', () => {
    render(<OverviewDashboard model={model} />);
    openDetails('Lighting and sensor details');
    expect(screen.getAllByRole('meter')).toHaveLength(5);
  });
});
