import {
  advanceScenario,
  pauseScenario,
  resetScenario,
  resumeScenario,
  selectScenario,
  setPlaybackSpeed,
  startScenario,
} from './scenario-controller';
import type { ScenarioControllerAction, ScenarioControllerState } from './scenario-model';

const assertNever = (value: never): never => {
  throw new Error(`Unhandled scenario action: ${JSON.stringify(value)}`);
};

export function scenarioControllerReducer(
  state: ScenarioControllerState,
  action: ScenarioControllerAction,
): ScenarioControllerState {
  switch (action.type) {
    case 'SELECT_SCENARIO':
      return selectScenario(state, action.scenarioId);
    case 'START':
      return startScenario(state);
    case 'PAUSE':
      return pauseScenario(state);
    case 'RESUME':
      return resumeScenario(state);
    case 'RESET':
      return resetScenario(state);
    case 'STEP':
      return advanceScenario(state, 1_000, 'STEP');
    case 'ADVANCE':
      return advanceScenario(state, 5_000, 'ADVANCE');
    case 'SET_SPEED':
      return setPlaybackSpeed(state, action.speed);
    default:
      return assertNever(action);
  }
}

export { createScenarioControllerState } from './scenario-controller';
