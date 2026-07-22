import { fireEvent, render, screen, within } from '@testing-library/react';
import { AlertsDashboard } from '@/components/alerts/alerts-dashboard';
import { AlertsTable } from '@/components/alerts/alerts-table';
import { activityFixture } from '@/features/activity/activity-fixture';
import { adaptAlerts } from '@/features/alerts/alerts-adapter';

const adapted = adaptAlerts(activityFixture.alerts);
if (!adapted.ok) throw new Error('Expected valid alert fixture');
const records = adapted.records;

describe('Alerts page polish', () => {
  it.each([
    ['Total alerts', '15'],
    ['Active', '5'],
    ['Resolved', '10'],
    ['Critical', '1'],
    ['Warning', '9'],
    ['Latest timestamp', '15/06/2026, 20:29:00 UTC'],
  ])('renders the %s selector-backed summary card', (label, value) => {
    render(<AlertsDashboard />);
    expect(screen.getByLabelText(`${label} summary`)).toHaveTextContent(value);
  });

  it('marks every summary icon as decorative', () => {
    const { container } = render(<AlertsDashboard />);
    const cards = container.querySelectorAll('.alert-summary-grid .summary-card');
    expect(cards).toHaveLength(6);
    cards.forEach((card) => {
      expect(card.querySelector('.summary-card-icon')).toHaveAttribute('aria-hidden', 'true');
      expect(card.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('keeps the dataset total distinct from filtered result count', () => {
    render(<AlertsDashboard />);
    fireEvent.change(screen.getByLabelText('Alert severity'), { target: { value: 'CRITICAL' } });
    expect(screen.getByLabelText('Total alerts summary')).toHaveTextContent('15');
    expect(screen.getByText('1 of 15 alerts shown')).toBeVisible();
  });

  it('gives the active critical row the strongest semantic class and attributes', () => {
    render(<AlertsDashboard />);
    const row = screen.getByRole('button', { name: 'View ALERT_SIM_001' }).closest('tr');
    expect(row).toHaveClass('alert-row--critical-active');
    expect(row).toHaveAttribute('data-severity', 'CRITICAL');
    expect(row).toHaveAttribute('data-status', 'ACTIVE');
    expect(row).toHaveAttribute('data-active', 'true');
  });

  it('keeps critical severity visible as text', () => {
    render(<AlertsDashboard />);
    const row = screen.getByRole('button', { name: 'View ALERT_SIM_001' }).closest('tr')!;
    expect(within(row).getByText('Critical')).toBeVisible();
  });

  it('does not apply critical emphasis to warning or info rows', () => {
    render(<AlertsDashboard />);
    const warning = screen.getByRole('button', { name: 'View ALERT_SIM_015' }).closest('tr');
    const info = screen.getByRole('button', { name: 'View ALERT_SIM_005' }).closest('tr');
    expect(warning).not.toHaveClass('alert-row--critical', 'alert-row--critical-active');
    expect(info).not.toHaveClass('alert-row--critical', 'alert-row--critical-active');
  });

  it('uses the standard critical class for a resolved critical record', () => {
    const record = { ...records[1]!, id: 'ALERT_RESOLVED_CRITICAL', severity: 'CRITICAL' as const };
    render(<AlertsTable records={[record]} selectedId={null} onSelect={() => {}} />);
    const row = screen.getByRole('button', { name: 'View ALERT_RESOLVED_CRITICAL' }).closest('tr');
    expect(row).toHaveClass('alert-row--critical');
    expect(row).not.toHaveClass('alert-row--critical-active');
    expect(row).toHaveAttribute('data-status', 'RESOLVED');
  });

  it('preserves selected row state and detail selection', () => {
    render(<AlertsDashboard />);
    const view = screen.getByRole('button', { name: 'View ALERT_SIM_001' });
    fireEvent.click(view);
    expect(view).toHaveAttribute('aria-pressed', 'true');
    expect(view.closest('tr')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('complementary', { name: 'NODE_2 offline' })).toBeVisible();
  });

  it('preserves table semantics and newest-first order', () => {
    render(<AlertsDashboard />);
    const table = screen.getByRole('table', { name: 'Simulated alert history, newest first' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent('ALERT_SIM_015');
  });
});
