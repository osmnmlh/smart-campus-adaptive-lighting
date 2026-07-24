import {
  SCENARIO_SPEEDS,
  type ScenarioControllerAction,
  type ScenarioLifecycle,
  type ScenarioSpeed,
} from '@/features/scenarios/scenario-model';
import { selectControlAvailability } from '@/features/scenarios/scenario-selectors';
import { useLocalization } from '@/features/localization/use-localization';

type ScenarioControlsProps = Readonly<{
  lifecycle: ScenarioLifecycle;
  speed: ScenarioSpeed;
  dispatch: (action: ScenarioControllerAction) => void;
}>;

export function ScenarioControls({ lifecycle, speed, dispatch }: ScenarioControlsProps) {
  const controls = selectControlAvailability(lifecycle);
  const { t } = useLocalization();
  return (
    <section className="scenario-controls" aria-labelledby="scenario-controls-title">
      <div>
        <p className="eyebrow">{t('scenarios.manualClock')}</p>
        <h2 id="scenario-controls-title">{t('scenarios.controls')}</h2>
      </div>
      <div className="scenario-control-buttons" aria-label={t('scenarios.lifecycleControls')}>
        <button
          type="button"
          disabled={!controls.canStart}
          onClick={() => dispatch({ type: 'START' })}
        >
          {t('scenarios.start')}
        </button>
        <button
          type="button"
          disabled={!controls.canPause}
          onClick={() => dispatch({ type: 'PAUSE' })}
        >
          {t('scenarios.pause')}
        </button>
        <button
          type="button"
          disabled={!controls.canResume}
          onClick={() => dispatch({ type: 'RESUME' })}
        >
          {t('scenarios.resume')}
        </button>
        <button
          type="button"
          disabled={!controls.canReset}
          onClick={() => dispatch({ type: 'RESET' })}
        >
          {t('scenarios.reset')}
        </button>
        <button
          type="button"
          disabled={!controls.canAdvance}
          onClick={() => dispatch({ type: 'STEP' })}
        >
          {t('scenarios.step')}
        </button>
        <button
          type="button"
          disabled={!controls.canAdvance}
          onClick={() => dispatch({ type: 'ADVANCE' })}
        >
          {t('scenarios.advance')}
        </button>
      </div>
      <fieldset className="scenario-speed-control">
        <legend>{t('scenarios.speed')}</legend>
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
      <p className="scenario-control-note">{t('scenarios.speedNote')}</p>
    </section>
  );
}
