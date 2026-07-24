import { fireEvent, render, screen, within } from '@testing-library/react';
import { ScenarioDashboard } from '@/components/scenarios/scenario-dashboard';

const snapshotDetails = () => screen.getByText('Scenario snapshot details').closest('details')!;

const openSnapshot = () => {
  const details = snapshotDetails();
  if (!details.open)
    fireEvent.click(within(details).getByText('Scenario snapshot details').closest('summary')!);
  return details;
};

const snapshotValue = (label: string) => {
  const details = openSnapshot();
  const term = within(details).getByText(label, { selector: 'dt' });
  return term.parentElement?.querySelector('dd');
};

describe('Scenario snapshot progressive disclosure', () => {
  it('keeps stage, controls, and progress visible while snapshot details are closed', () => {
    render(<ScenarioDashboard />);
    expect(screen.getByRole('figure', { name: 'Campus road stage' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Scenario controls' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeVisible();
    expect(snapshotDetails()).not.toHaveAttribute('open');
  });

  it('labels the closed panel as a complete deterministic snapshot breakdown', () => {
    render(<ScenarioDashboard />);
    const summary = within(snapshotDetails());
    expect(summary.getByText('Scenario snapshot details')).toBeVisible();
    expect(summary.getByText(/complete deterministic state and entity breakdown/i)).toBeVisible();
  });

  it('reveals the unavailable initial snapshot on demand', () => {
    render(<ScenarioDashboard />);
    openSnapshot();
    expect(screen.getByRole('heading', { name: 'Snapshot preview' })).toBeVisible();
    expect(screen.getByText('Unavailable')).toBeVisible();
  });

  it('keeps the initial IDLE lifecycle outside the collapsed panel', () => {
    render(<ScenarioDashboard />);
    expect(screen.getByText('IDLE')).toBeVisible();
    expect(snapshotDetails()).not.toHaveAttribute('open');
  });

  it('updates active sensor state while the snapshot remains closed', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Left to Right/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(snapshotDetails()).not.toHaveAttribute('open');
    expect(snapshotValue('Active sensor IDs')).toHaveTextContent('sensor-ir-1');
  });

  it('preserves all five lamp entity details after opening', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Empty Campus/i }));
    openSnapshot();
    expect(screen.getByLabelText('Lamp snapshot details').children).toHaveLength(5);
    expect(screen.getByLabelText('Lamp snapshot details')).toHaveTextContent('lamp-5');
  });

  it('shows no offline node IDs for a healthy selected scenario', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Empty Campus/i }));
    expect(snapshotValue('Offline node IDs')).toHaveTextContent('None');
  });

  it('shows the current offline node after the deterministic node-offline run', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Node Offline/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: '5x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Advance +5s' }));
    expect(snapshotValue('Offline node IDs')).toHaveTextContent('node-2');
    expect(snapshotValue('Active nodes')).toHaveTextContent('2 / 3');
  });

  it('preserves pause and resume lifecycle controls outside the panel', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Center Presence/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
  });

  it('preserves reset and step behavior without forcing the panel open', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Right to Left/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getAllByText('READY')).toHaveLength(2);
    expect(snapshotDetails()).not.toHaveAttribute('open');
  });
});
