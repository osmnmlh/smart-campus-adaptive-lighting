import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlertsDashboard } from '@/components/alerts/alerts-dashboard';

describe('AlertsDashboard', () => {
  it('renders explicit simulated provenance and no live claim', () => {
    render(<AlertsDashboard />);
    const provenance = screen.getByLabelText('Alert data provenance');
    expect(provenance).toHaveTextContent('SIMULATED');
    expect(provenance).toHaveTextContent('No live backend connection');
    expect(provenance).toHaveTextContent('Not production incidents');
  });
  it('renders full fixture summary and accessible table', () => {
    render(<AlertsDashboard />);
    const summary = screen.getByRole('heading', { name: 'Dataset summary' }).closest('section');
    if (summary === null) throw new Error('Expected alert summary section');
    expect(within(summary).getByText('Total alerts').parentElement).toHaveTextContent('15');
    expect(within(summary).getByText('Active').parentElement).toHaveTextContent('5');
    expect(within(summary).getByText('Resolved').parentElement).toHaveTextContent('10');
    expect(
      screen.getByRole('table', { name: 'Simulated alert history, newest first' }),
    ).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(16);
  });
  it('filters by severity', () => {
    render(<AlertsDashboard />);
    fireEvent.change(screen.getByLabelText('Alert severity'), { target: { value: 'CRITICAL' } });
    expect(screen.getByText('1 of 15 alerts shown')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View ALERT_SIM_001' })).toBeVisible();
  });
  it('filters by status', () => {
    render(<AlertsDashboard />);
    fireEvent.change(screen.getByLabelText('Alert status'), { target: { value: 'ACTIVE' } });
    expect(screen.getByText('5 of 15 alerts shown')).toBeVisible();
  });
  it('filters by canonical entity label', () => {
    render(<AlertsDashboard />);
    fireEvent.change(screen.getByLabelText('Alert entity'), {
      target: { value: 'sensor-bh1750-1' },
    });
    expect(screen.getByText('1 of 15 alerts shown')).toBeVisible();
    expect(screen.getByText('BH1750 simulated data stale')).toBeVisible();
  });
  it('filters by fixed time range', () => {
    render(<AlertsDashboard />);
    fireEvent.change(screen.getByLabelText('Alert time range'), { target: { value: '15m' } });
    expect(screen.getByText('5 of 15 alerts shown')).toBeVisible();
  });
  it('shows and clears a no-match state', () => {
    render(<AlertsDashboard />);
    fireEvent.change(screen.getByLabelText('Alert severity'), { target: { value: 'EMERGENCY' } });
    expect(
      screen.getByRole('heading', { name: 'No alerts match the selected filters' }),
    ).toBeVisible();
    const empty = screen.getByRole('heading', {
      name: 'No alerts match the selected filters',
    }).parentElement;
    if (empty === null) throw new Error('Expected alert empty state');
    fireEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('15 of 15 alerts shown')).toBeVisible();
  });
  it('opens a read-only detail panel for the selected alert', () => {
    render(<AlertsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'View ALERT_SIM_001' }));
    const detail = screen.getByRole('complementary', { name: 'NODE_2 offline' });
    expect(within(detail).getByText('ALERT_SIM_001')).toBeVisible();
    expect(within(detail).getByText('node-offline')).toBeVisible();
    expect(within(detail).getByText(/not a production incident/i)).toBeVisible();
  });
  it('renders a safe empty-fixture state', () => {
    render(<AlertsDashboard rawAlerts={[]} />);
    expect(
      screen.getByRole('heading', { name: 'No simulated alert records are available' }),
    ).toBeVisible();
    const empty = screen.getByRole('heading', {
      name: 'No simulated alert records are available',
    }).parentElement;
    if (empty === null) throw new Error('Expected alert empty state');
    expect(within(empty).queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });
  it('renders a safe invalid-fixture state without retry', () => {
    render(<AlertsDashboard rawAlerts={[{ id: 'BROKEN' }]} />);
    expect(screen.getByRole('heading', { name: 'Alert history is unavailable' })).toBeVisible();
    expect(screen.getByText(/failed runtime validation/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
  it.each([/acknowledge/i, /resolve alert/i, /delete/i, /export/i])(
    'does not expose a %s action',
    (name) => {
      render(<AlertsDashboard />);
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    },
  );
});
