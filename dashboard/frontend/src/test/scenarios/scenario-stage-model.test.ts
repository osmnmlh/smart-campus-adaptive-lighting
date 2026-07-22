import { Direction, LampOperatingState } from '@smart-campus/contracts';
import { createScenarioControllerState } from '@/features/scenarios/scenario-controller';
import {
  SCENARIO_STAGE_LAMPS,
  selectScenarioStageViewModel,
} from '@/features/scenarios/scenario-stage-model';
import type { ScenarioControllerState } from '@/features/scenarios/scenario-model';

const stateWith = (overrides: Partial<ScenarioControllerState> = {}): ScenarioControllerState => ({
  ...createScenarioControllerState('left-to-right'),
  ...overrides,
});

const activeLampState = (state: ScenarioControllerState, activeId: string) => ({
  ...state,
  lamps: state.lamps.map((lamp) => ({
    ...lamp,
    operatingState:
      lamp.lampId === activeId ? LampOperatingState.ACTIVE : LampOperatingState.STANDBY,
    brightnessPercent: lamp.lampId === activeId ? 100 : 30,
  })),
});

describe('Scenario Stage presentation selector', () => {
  it('keeps the canonical physical order L1 through L5', () => {
    expect(selectScenarioStageViewModel(stateWith()).lamps.map((lamp) => lamp.id)).toEqual([
      'L1',
      'L2',
      'L3',
      'L4',
      'L5',
    ]);
    expect(SCENARIO_STAGE_LAMPS.map((lamp) => lamp.x)).toEqual([110, 270, 450, 630, 790]);
  });

  it.each([
    ['NODE_1', ['L1', 'L2']],
    ['NODE_2', ['L3']],
    ['NODE_3', ['L4', 'L5']],
  ] as const)('maps %s to its physical lamp ownership', (nodeId, lampIds) => {
    const node = selectScenarioStageViewModel(stateWith()).nodes.find(
      (candidate) => candidate.id === nodeId,
    );
    expect(node?.lampIds).toEqual(lampIds);
  });

  it('maps IR1 through IR5 to the matching lamp positions', () => {
    expect(
      selectScenarioStageViewModel(stateWith()).sensors.map((sensor) => [sensor.id, sensor.lampId]),
    ).toEqual([
      ['IR1', 'L1'],
      ['IR2', 'L2'],
      ['IR3', 'L3'],
      ['IR4', 'L4'],
      ['IR5', 'L5'],
    ]);
  });

  it('keeps BH1750 separate from motion sensor mapping', () => {
    const model = selectScenarioStageViewModel(stateWith({ activeSensorIds: ['sensor-bh1750-1'] }));
    expect(model.ambientSensor).toMatchObject({
      id: 'BH1750',
      description: 'Ambient light sensor',
      active: true,
    });
    expect(model.motionLampId).toBeNull();
    expect(model.sensors).toHaveLength(5);
  });

  it.each([
    ['sensor-ir-1', 'L1'],
    ['sensor-ir-3', 'L3'],
    ['sensor-ir-5', 'L5'],
  ])('maps one active IR sensor %s to %s', (sensorId, lampId) => {
    expect(
      selectScenarioStageViewModel(stateWith({ activeSensorIds: [sensorId] })).motionLampId,
    ).toBe(lampId);
  });

  it('hides the motion marker when multiple active sensors remain ambiguous', () => {
    const model = selectScenarioStageViewModel(
      stateWith({ activeSensorIds: ['sensor-ir-1', 'sensor-ir-2'] }),
    );
    expect(model.motionLampId).toBeNull();
    expect(model.motionLabel).toBe('Motion position unavailable');
  });

  it('uses one exact active-lamp match to resolve multiple active sensors', () => {
    const state = activeLampState(
      stateWith({ activeSensorIds: ['sensor-ir-2', 'sensor-ir-3'] }),
      'lamp-3',
    );
    expect(selectScenarioStageViewModel(state).motionLampId).toBe('L3');
  });

  it('shows center presence at L3 without a directional arrow', () => {
    const state = activeLampState(
      stateWith({ activeSensorIds: ['sensor-ir-3'], direction: Direction.NONE }),
      'lamp-3',
    );
    const model = selectScenarioStageViewModel(state);
    expect(model.motionLampId).toBe('L3');
    expect(model.direction.arrow).toBeNull();
  });

  it.each([
    [Direction.LEFT_TO_RIGHT, 'right', 'Left to right'],
    [Direction.RIGHT_TO_LEFT, 'left', 'Right to left'],
    [Direction.NONE, null, 'No direction'],
    [Direction.UNKNOWN, null, 'Direction unknown'],
  ] as const)('maps direction %s conservatively', (direction, arrow, label) => {
    expect(selectScenarioStageViewModel(stateWith({ direction })).direction).toMatchObject({
      arrow,
      label,
    });
  });

  it('maps an offline communication node without turning its lamps off', () => {
    const model = selectScenarioStageViewModel(stateWith({ offlineNodeIds: ['node-2'] }));
    expect(model.nodes.find((node) => node.id === 'NODE_2')?.offline).toBe(true);
    expect(model.lamps.find((lamp) => lamp.id === 'L3')?.operatingState).toBe(
      LampOperatingState.STANDBY,
    );
  });

  it('derives brightness halo size and opacity from the explicit percentage', () => {
    const state = activeLampState(stateWith(), 'lamp-2');
    const lamps = selectScenarioStageViewModel(state).lamps;
    const low = lamps.find((lamp) => lamp.id === 'L1');
    const high = lamps.find((lamp) => lamp.id === 'L2');
    expect(high?.haloRadius).toBeGreaterThan(low?.haloRadius ?? 0);
    expect(high?.haloOpacity).toBeGreaterThan(low?.haloOpacity ?? 0);
  });

  it('does not mutate input state and is deterministic for the same input', () => {
    const state = stateWith({ activeSensorIds: ['sensor-ir-4'], offlineNodeIds: ['node-1'] });
    const before = JSON.stringify(state);
    const first = selectScenarioStageViewModel(state);
    const second = selectScenarioStageViewModel(state);
    expect(JSON.stringify(state)).toBe(before);
    expect(second).toEqual(first);
  });

  it('does not create a vehicle, person, or bicycle classification', () => {
    const model = selectScenarioStageViewModel(
      stateWith({ activeSensorIds: ['sensor-ir-2'], direction: Direction.LEFT_TO_RIGHT }),
    );
    expect(JSON.stringify(model)).not.toMatch(/vehicle|person|pedestrian|cyclist|bicycle/i);
  });
});
