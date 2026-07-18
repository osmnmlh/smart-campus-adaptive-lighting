import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LogsDashboard } from '@/components/logs/logs-dashboard';

describe('LogsDashboard', () => {
  it('renders explicit simulated provenance and no live stream claim', () => {
    render(<LogsDashboard />);
    const provenance = screen.getByLabelText('Log data provenance');
    expect(provenance).toHaveTextContent('SIMULATED');
    expect(provenance).toHaveTextContent('No live stream');
    expect(provenance).toHaveTextContent('Not production audit records');
  });
  it('renders full fixture summary and accessible table', () => {
    render(<LogsDashboard />);
    const summary = screen.getByRole('heading', { name: 'Dataset summary' }).closest('section');
    if (summary === null) throw new Error('Expected log summary section');
    expect(within(summary).getByText('Total logs').parentElement).toHaveTextContent('42');
    expect(within(summary).getByText('Info').parentElement).toHaveTextContent('29');
    expect(within(summary).getByText('Error').parentElement).toHaveTextContent('2');
    expect(
      screen.getByRole('table', { name: 'Simulated operational logs, newest first' }),
    ).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(43);
  });
  it('filters by category', () => {
    render(<LogsDashboard />);
    fireEvent.change(screen.getByLabelText('Log category'), { target: { value: 'DIRECTION' } });
    expect(screen.getByText('2 of 42 logs shown')).toBeVisible();
  });
  it('filters by level', () => {
    render(<LogsDashboard />);
    fireEvent.change(screen.getByLabelText('Log level'), { target: { value: 'ERROR' } });
    expect(screen.getByText('2 of 42 logs shown')).toBeVisible();
  });
  it('filters by canonical entity label', () => {
    render(<LogsDashboard />);
    fireEvent.change(screen.getByLabelText('Log entity'), { target: { value: 'node-2' } });
    expect(screen.getByText('2 of 42 logs shown')).toBeVisible();
    expect(screen.getByText('NODE_2 went offline')).toBeVisible();
  });
  it('filters by fixed time range', () => {
    render(<LogsDashboard />);
    fireEvent.change(screen.getByLabelText('Log time range'), { target: { value: '15m' } });
    expect(screen.getByText('10 of 42 logs shown')).toBeVisible();
  });
  it('combines filters and can clear them', () => {
    render(<LogsDashboard />);
    fireEvent.change(screen.getByLabelText('Log category'), { target: { value: 'DIRECTION' } });
    fireEvent.change(screen.getByLabelText('Log level'), { target: { value: 'ERROR' } });
    expect(
      screen.getByRole('heading', { name: 'No logs match the selected filters' }),
    ).toBeVisible();
    const empty = screen.getByRole('heading', {
      name: 'No logs match the selected filters',
    }).parentElement;
    if (empty === null) throw new Error('Expected log empty state');
    fireEvent.click(within(empty).getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('42 of 42 logs shown')).toBeVisible();
  });
  it('opens a read-only detail panel for the selected log', () => {
    render(<LogsDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'View LOG_SIM_035' }));
    const detail = screen.getByRole('complementary', { name: 'NODE_2 went offline' });
    expect(within(detail).getByText('LOG_SIM_035')).toBeVisible();
    expect(within(detail).getByText('node-offline')).toBeVisible();
    expect(within(detail).getByText('35')).toBeVisible();
    expect(within(detail).getByText(/not a production log/i)).toBeVisible();
  });
  it('renders a safe empty-fixture state', () => {
    render(<LogsDashboard rawLogs={[]} />);
    expect(
      screen.getByRole('heading', { name: 'No simulated log records are available' }),
    ).toBeVisible();
    const empty = screen.getByRole('heading', {
      name: 'No simulated log records are available',
    }).parentElement;
    if (empty === null) throw new Error('Expected log empty state');
    expect(within(empty).queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });
  it('renders a safe invalid-fixture state without retry', () => {
    render(<LogsDashboard rawLogs={[{ id: 'BROKEN' }]} />);
    expect(screen.getByRole('heading', { name: 'Log history is unavailable' })).toBeVisible();
    expect(screen.getByText(/failed runtime validation/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
  it.each([/replay/i, /delete/i, /export/i, /tail/i])('does not expose a %s action', (name) => {
    render(<LogsDashboard />);
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });
});
