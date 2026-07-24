import { render, screen } from '@testing-library/react';
import { Direction, LampOperatingState } from '@smart-campus/contracts';
import { ScenarioStage } from '@/components/scenarios/scenario-stage';
import { createScenarioControllerState } from '@/features/scenarios/scenario-controller';
import type { ScenarioControllerState } from '@/features/scenarios/scenario-model';

const stateWith = (overrides: Partial<ScenarioControllerState> = {}): ScenarioControllerState => ({
  ...createScenarioControllerState('left-to-right'),
  ...overrides,
});

const withActiveLamp = (
  state: ScenarioControllerState,
  lampId: ScenarioControllerState['lamps'][number]['lampId'],
): ScenarioControllerState => ({
  ...state,
  lamps: state.lamps.map((lamp) => ({
    ...lamp,
    operatingState: lamp.lampId === lampId ? LampOperatingState.ACTIVE : LampOperatingState.STANDBY,
    brightnessPercent: lamp.lampId === lampId ? 100 : 30,
  })),
});

describe('ScenarioStage', () => {
  it('renders an accessible figure and named SVG summary', () => {
    render(<ScenarioStage state={stateWith()} />);
    expect(screen.getByRole('figure', { name: 'Campus road stage' })).toBeVisible();
    expect(
      screen.getByRole('img', { name: /Five-lamp simulated campus road scene/i }),
    ).toBeVisible();
    expect(screen.getAllByText(/Five lamps ordered L1 through L5/i)).toHaveLength(2);
  });

  it('renders five lamps in physical DOM order', () => {
    const { container } = render(<ScenarioStage state={stateWith()} />);
    expect(
      [...container.querySelectorAll<SVGGElement>('[data-lamp-id]')].map((item) =>
        item.getAttribute('data-lamp-id'),
      ),
    ).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
  });

  it('renders three node groups with visible ownership labels', () => {
    const { container } = render(<ScenarioStage state={stateWith()} />);
    expect(container.querySelectorAll('[data-node-id]')).toHaveLength(3);
    const status = screen.getByLabelText('Node communication status');
    expect(status).toHaveTextContent('NODE_1: Online · L1, L2');
    expect(status).toHaveTextContent('NODE_2: Online · L3');
    expect(status).toHaveTextContent('NODE_3: Online · L4, L5');
  });

  it('renders five inactive IR sensors with text state', () => {
    const { container } = render(<ScenarioStage state={stateWith()} />);
    const sensors = container.querySelectorAll('[data-sensor-id]');
    expect(sensors).toHaveLength(5);
    sensors.forEach((sensor) => expect(sensor).toHaveAttribute('data-active', 'false'));
    expect(screen.getAllByText(/IR[1-5] · Inactive/)).toHaveLength(5);
  });

  it('renders an active IR sensor without classifying the moving subject', () => {
    const { container } = render(
      <ScenarioStage state={stateWith({ activeSensorIds: ['sensor-ir-2'] })} />,
    );
    expect(container.querySelector('[data-sensor-id="IR2"]')).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByText('IR2 · Active')).toBeVisible();
    expect(container.textContent).not.toMatch(/vehicle|person|pedestrian|cyclist|bicycle/i);
  });

  it('presents BH1750 only as an ambient light sensor', () => {
    render(<ScenarioStage state={stateWith({ activeSensorIds: ['sensor-bh1750-1'] })} />);
    expect(screen.getAllByText(/BH1750: Ambient light sensor/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Motion position unavailable')).toBeVisible();
  });

  it('renders visible operating state and brightness percentage for every lamp', () => {
    render(<ScenarioStage state={stateWith()} />);
    expect(screen.getAllByText('Standby')).toHaveLength(5);
    expect(screen.getAllByText('30% brightness')).toHaveLength(5);
  });

  it('changes halo attributes with brightness', () => {
    const { container } = render(<ScenarioStage state={withActiveLamp(stateWith(), 'lamp-3')} />);
    const lowHalo = container.querySelector('[data-lamp-id="L2"] .scenario-lamp-halo');
    const highHalo = container.querySelector('[data-lamp-id="L3"] .scenario-lamp-halo');
    expect(Number(highHalo?.getAttribute('r'))).toBeGreaterThan(Number(lowHalo?.getAttribute('r')));
    expect(container.querySelector('[data-lamp-id="L3"]')).toHaveAttribute(
      'data-brightness',
      '100',
    );
  });

  it('shows a neutral motion marker only for an exact IR location', () => {
    const { container } = render(
      <ScenarioStage state={stateWith({ activeSensorIds: ['sensor-ir-4'] })} />,
    );
    expect(container.querySelector('[data-motion-position="L4"]')).not.toBeNull();
    expect(screen.getAllByText(/Motion detected near L4/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Motion detected', { selector: 'text' })).toBeVisible();
  });

  it('hides the marker when multiple IR locations are ambiguous', () => {
    const { container } = render(
      <ScenarioStage state={stateWith({ activeSensorIds: ['sensor-ir-1', 'sensor-ir-2'] })} />,
    );
    expect(container.querySelector('.scenario-motion-marker')).toBeNull();
    expect(screen.getByText('Motion position unavailable')).toBeVisible();
  });

  it.each([
    [Direction.LEFT_TO_RIGHT, 'LEFT_TO_RIGHT', 'Left to right'],
    [Direction.RIGHT_TO_LEFT, 'RIGHT_TO_LEFT', 'Right to left'],
  ] as const)('renders %s direction with visible text', (direction, dataDirection, label) => {
    const { container } = render(<ScenarioStage state={stateWith({ direction })} />);
    expect(container.querySelector('.scenario-direction-arrow')).toHaveAttribute(
      'data-direction',
      dataDirection,
    );
    expect(screen.getAllByText(new RegExp(`Direction: ${label}`, 'i')).length).toBeGreaterThan(0);
  });

  it.each([Direction.NONE, Direction.UNKNOWN])(
    'does not render a direction arrow for %s',
    (direction) => {
      const { container } = render(<ScenarioStage state={stateWith({ direction })} />);
      expect(container.querySelector('.scenario-direction-arrow')).toBeNull();
    },
  );

  it('marks an offline node in text and keeps its current lamp state', () => {
    const { container } = render(
      <ScenarioStage state={stateWith({ offlineNodeIds: ['node-2'] })} />,
    );
    expect(container.querySelector('[data-node-id="NODE_2"]')).toHaveAttribute(
      'data-offline',
      'true',
    );
    expect(screen.getByLabelText('Node communication status')).toHaveTextContent(
      'NODE_2: Offline · L3',
    );
    expect(container.querySelector('[data-lamp-id="L3"]')).toHaveAttribute(
      'data-operating-state',
      'STANDBY',
    );
  });

  it('renders an empty-campus style scene without marker or arrow', () => {
    const { container } = render(
      <ScenarioStage state={createScenarioControllerState('empty-campus')} />,
    );
    expect(container.querySelector('.scenario-motion-marker')).toBeNull();
    expect(container.querySelector('.scenario-direction-arrow')).toBeNull();
    expect(screen.getByText('Empty Campus')).toBeVisible();
  });

  it('keeps decorative Lucide icons out of the tab and accessibility flow', () => {
    const { container } = render(<ScenarioStage state={stateWith()} />);
    container.querySelectorAll('svg.lucide').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
    });
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
  });

  it('uses a contained responsive scroll contract instead of page-level fixed width', () => {
    const { container } = render(<ScenarioStage state={stateWith()} />);
    expect(container.querySelector('.scenario-stage-scroll')).toHaveAttribute(
      'data-responsive-behavior',
      'contained-scroll',
    );
    expect(container.querySelector('.scenario-stage')).not.toBeNull();
  });
});
