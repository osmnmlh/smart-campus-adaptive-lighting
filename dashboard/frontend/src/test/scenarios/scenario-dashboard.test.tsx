import { fireEvent, render, screen, within } from '@testing-library/react';
import { ScenarioDashboard } from '@/components/scenarios/scenario-dashboard';

describe('ScenarioDashboard', () => {
  it('renders all required regions with a safe local-only default', () => {
    render(<ScenarioDashboard />);
    expect(screen.getByRole('heading', { name: 'Scenario Controls' })).toBeVisible();
    expect(screen.getByLabelText('Local simulation notice')).toBeVisible();
    expect(screen.getByText(/do not send commands to devices/i)).toBeVisible();
    expect(screen.getByRole('group', { name: 'Choose a local scenario' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /Empty Campus/i })).toBeChecked();
    expect(screen.getByRole('heading', { name: 'Scenario controls' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Snapshot preview' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Presentation events' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Scenario progress' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.getAllByText('READY')).toHaveLength(2);
    expect(screen.getAllByText('SIMULATED').length).toBeGreaterThan(0);
    expect(screen.getByText('GOOD')).toBeVisible();
    expect(screen.getByText(/Electrical metrics are not available/i)).toBeVisible();
  });

  it('runs left-to-right deterministically with manual steps', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Left to Right/i }));
    expect(screen.getByRole('radio', { name: /Left to Right/i })).toBeChecked();
    expect(screen.getAllByText('0:50')).toHaveLength(3);
    expect(screen.getByText('IR1 entry')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getAllByText('RUNNING')).toHaveLength(2);
    expect(screen.getByText('running')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(screen.getByText('IR1 entry', { selector: 'strong' })).toBeVisible();
    expect(screen.getByText('1 / 6 active')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(screen.getByText('LEFT_TO_RIGHT')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
    expect(screen.getByText('2 / 6 active')).toBeVisible();
    const snapshot = screen.getByRole('heading', { name: 'Snapshot preview' }).closest('section');
    expect(snapshot).not.toBeNull();
    expect(within(snapshot!).getByText('2 / 6 active')).toBeVisible();
  });

  it('pauses, resumes, resets, and locks scenario selection while active', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('radio', { name: /Empty Campus/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getAllByText('PAUSED')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Step +1s' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(screen.getAllByText('RUNNING')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getAllByText('READY')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /Empty Campus/i })).toBeEnabled();
    expect(
      screen.getByText(/Start the scenario to create local presentation events/i),
    ).toBeVisible();
  });

  it('shows one node-offline alert and completes at the scenario boundary', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Node Offline/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: '5x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Advance +5s' }));
    expect(screen.getAllByText('COMPLETED')).toHaveLength(2);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('2 / 3 online')).toBeVisible();
    const snapshot = screen.getByRole('heading', { name: 'Snapshot preview' }).closest('section');
    expect(snapshot).not.toBeNull();
    expect(within(snapshot!).getByText('1', { selector: 'dd' })).toBeVisible();
    expect(screen.getByText('NODE_2 goes offline')).toBeVisible();
    expect(screen.getByText('NODE_2 remains offline')).toBeVisible();
    expect(screen.getByText('completed')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Step +1s' })).toBeDisabled();
  });

  it('does not expose live, persistence, retry, or invented electrical claims', () => {
    const { container } = render(<ScenarioDashboard />);
    expect(screen.queryByText(/connected live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autoplay enabled/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/kWh/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/energy saving/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cost saving/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/carbon reduction/i)).not.toBeInTheDocument();
    expect(container.querySelector('input[type="number"]')).not.toBeInTheDocument();
    expect(container.querySelector('audio')).not.toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });
});
