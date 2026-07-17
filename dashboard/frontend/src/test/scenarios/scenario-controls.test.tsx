import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ScenarioControls } from '@/components/scenarios/scenario-controls';

describe('ScenarioControls', () => {
  it('enables only start in ready state and exposes every speed', () => {
    const dispatch = vi.fn();
    render(<ScenarioControls lifecycle="READY" speed={1} dispatch={dispatch} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Step +1s' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Advance +5s' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '0.5x' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '1x' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '2x' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '5x' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/No timer or autoplay is running/i)).toBeVisible();
  });

  it('dispatches lifecycle and manual clock actions', () => {
    const dispatch = vi.fn();
    const { rerender } = render(
      <ScenarioControls lifecycle="READY" speed={1} dispatch={dispatch} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'START' });
    rerender(<ScenarioControls lifecycle="RUNNING" speed={1} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Step +1s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Advance +5s' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'PAUSE' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'STEP' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'ADVANCE' });
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
    rerender(<ScenarioControls lifecycle="PAUSED" speed={1} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESUME' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'RESET' });
  });

  it.each([0.5, 1, 2, 5] as const)('dispatches %s x speed', (speed) => {
    const dispatch = vi.fn();
    render(<ScenarioControls lifecycle="READY" speed={1} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: `${speed}x` }));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SPEED', speed });
  });
});
