import {
  SCENARIO_SPEEDS,
  type ScenarioControllerAction,
  type ScenarioLifecycle,
  type ScenarioSpeed,
} from '@/features/scenarios/scenario-model';
import { selectControlAvailability } from '@/features/scenarios/scenario-selectors';

type ScenarioControlsProps = Readonly<{
  lifecycle: ScenarioLifecycle;
  speed: ScenarioSpeed;
  dispatch: (action: ScenarioControllerAction) => void;
}>;

export function ScenarioControls({ lifecycle, speed, dispatch }: ScenarioControlsProps) {
  const controls = selectControlAvailability(lifecycle);
  return (
    <section className="scenario-controls" aria-labelledby="scenario-controls-title">
      <div>
        <p className="eyebrow">Manual virtual clock</p>
        <h2 id="scenario-controls-title">Scenario controls</h2>
      </div>
      <div className="scenario-control-buttons" aria-label="Lifecycle controls">
        <button
          type="button"
          disabled={!controls.canStart}
          onClick={() => dispatch({ type: 'START' })}
        >
          Start
        </button>
        <button
          type="button"
          disabled={!controls.canPause}
          onClick={() => dispatch({ type: 'PAUSE' })}
        >
          Pause
        </button>
        <button
          type="button"
          disabled={!controls.canResume}
          onClick={() => dispatch({ type: 'RESUME' })}
        >
          Resume
        </button>
        <button
          type="button"
          disabled={!controls.canReset}
          onClick={() => dispatch({ type: 'RESET' })}
        >
          Reset
        </button>
        <button
          type="button"
          disabled={!controls.canAdvance}
          onClick={() => dispatch({ type: 'STEP' })}
        >
          Step +1s
        </button>
        <button
          type="button"
          disabled={!controls.canAdvance}
          onClick={() => dispatch({ type: 'ADVANCE' })}
        >
          Advance +5s
        </button>
      </div>
      <fieldset className="scenario-speed-control">
        <legend>Virtual speed multiplier</legend>
        <div>
          {SCENARIO_SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={speed === value}
              onClick={() => dispatch({ type: 'SET_SPEED', speed: value })}
            >
              {value}x
            </button>
          ))}
        </div>
      </fieldset>
      <p className="scenario-control-note">
        Speed multiplies only the next manual step. No timer or autoplay is running.
      </p>
    </section>
  );
}
