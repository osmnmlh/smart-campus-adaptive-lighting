import { fireEvent, render, screen, within } from '@testing-library/react';
import { ScenarioDashboard, ScenarioErrorNotice } from '@/components/scenarios/scenario-dashboard';

function snapshotValue(label: string) {
  const details = screen.getByText('Scenario snapshot details').closest('details');
  if (details && !details.open) {
    fireEvent.click(within(details).getByText('Scenario snapshot details').closest('summary')!);
  }
  const snapshot = screen.getByRole('heading', { name: 'Snapshot preview' }).closest('section');
  expect(snapshot).not.toBeNull();
  const term = within(snapshot!).getByText(label, { selector: 'dt' });
  const value = term.parentElement?.querySelector('dd');
  expect(value).not.toBeNull();
  return value!;
}

describe('ScenarioDashboard', () => {
  it('renders all required regions with a safe local-only default', () => {
    render(<ScenarioDashboard />);
    expect(screen.getByRole('heading', { name: 'Scenario Controls' })).toBeVisible();
    expect(screen.getByLabelText('Local simulation notice')).toBeVisible();
    expect(screen.getByText(/do not send commands to devices/i)).toBeVisible();
    expect(screen.getByRole('group', { name: 'Choose a local scenario' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    screen.getAllByRole('radio').forEach((radio) => expect(radio).not.toBeChecked());
    expect(screen.getByRole('heading', { name: 'Scenario controls' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Campus road stage' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeVisible();
    expect(screen.getByText('Scenario snapshot details')).toBeVisible();
    expect(screen.getByText('Snapshot preview')).not.toBeVisible();
    expect(screen.getByRole('heading', { name: 'Presentation events' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Scenario progress' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
    expect(screen.getByText('IDLE')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: /Choose a simulated scenario to begin/i }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Step +1s' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByText('Unavailable')).not.toBeVisible();
    expect(screen.getAllByText(/Simulated/)).toHaveLength(3);
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    expect(screen.getByText(/Select a simulated scenario to create/i)).not.toBeVisible();
  });

  it('places the stage before progress and preserves the snapshot preview', () => {
    render(<ScenarioDashboard />);
    const stage = screen.getByRole('figure', { name: 'Campus road stage' });
    const progress = screen.getByRole('heading', { name: 'Progress' }).closest('section');

    expect(stage.compareDocumentPosition(progress!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('Snapshot preview')).not.toBeVisible();
  });

  it('updates the stage from deterministic left-to-right controller steps', () => {
    const { container } = render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Left to Right/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(container.querySelector('[data-motion-position="L1"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(container.querySelector('[data-motion-position="L2"]')).not.toBeNull();
    expect(container.querySelector('[data-direction="LEFT_TO_RIGHT"]')).not.toBeNull();
  });

  it('runs left-to-right deterministically with manual steps', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Left to Right/i }));
    expect(screen.getByRole('radio', { name: /Left to Right/i })).toBeChecked();
    expect(screen.getAllByText('READY')).toHaveLength(2);
    expect(screen.getAllByText('0:50')).toHaveLength(3);
    expect(screen.getByText('IR1 entry')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getAllByText('RUNNING')).toHaveLength(2);
    expect(screen.getByText('running')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(screen.getByText('IR1 entry', { selector: 'strong' })).toBeVisible();
    expect(snapshotValue('Active sensor IDs')).toHaveTextContent('sensor-ir-1');
    expect(snapshotValue('Active lamps')).toHaveTextContent('1');
    expect(snapshotValue('Pre-light lamps')).toHaveTextContent('1');
    expect(snapshotValue('Standby lamps')).toHaveTextContent('3');
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    expect(screen.getByText('LEFT_TO_RIGHT')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
    expect(snapshotValue('Active sensor IDs')).toHaveTextContent('sensor-ir-2');
    expect(snapshotValue('Active lamps')).toHaveTextContent('1');
    expect(snapshotValue('Pre-light lamps')).toHaveTextContent('2');
    expect(snapshotValue('Standby lamps')).toHaveTextContent('2');
  });

  it('pauses, resumes, resets, and locks scenario selection while active', () => {
    render(<ScenarioDashboard />);
    fireEvent.click(screen.getByRole('radio', { name: /Empty Campus/i }));
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
      screen.getByText(/Select and start a scenario to create local presentation events/i),
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
    expect(snapshotValue('Active nodes')).toHaveTextContent('2 / 3');
    expect(snapshotValue('Active alerts')).toHaveTextContent('1');
    expect(snapshotValue('Off lamps')).toHaveTextContent('1');
    expect(screen.getByText('NODE_2 goes offline')).toBeVisible();
    expect(screen.getByText('NODE_2 remains offline')).toBeVisible();
    expect(screen.getByText('completed')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Step +1s' })).toBeDisabled();
  });

  it('announces recoverable transition errors without exposing technical details', () => {
    render(
      <ScenarioErrorNotice
        error={{
          code: 'INVALID_TRANSITION',
          action: 'PAUSE',
          lifecycle: 'READY',
          message: 'Pause is not available while the scenario is READY.',
        }}
      />,
    );

    const notice = screen.getByRole('status');
    expect(notice).toHaveAttribute('aria-live', 'polite');
    expect(notice).toHaveTextContent('INVALID_TRANSITION');
    expect(notice).toHaveTextContent('Pause is not available while the scenario is READY.');
    expect(notice).not.toHaveTextContent('Error:');
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
