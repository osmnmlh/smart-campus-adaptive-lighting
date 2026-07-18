import type { ScenarioControllerState } from '@/features/scenarios/scenario-model';
import { formatScenarioDuration, formatEventType } from '@/features/scenarios/scenario-formatters';
import {
  selectProgressPercent,
  selectRemainingEventCount,
  selectUpcomingEvents,
} from '@/features/scenarios/scenario-selectors';

export function ScenarioProgress({ state }: Readonly<{ state: ScenarioControllerState }>) {
  const progress = selectProgressPercent(state);
  const upcomingEvents = selectUpcomingEvents(state);
  return (
    <section className="scenario-progress-card" aria-labelledby="scenario-progress-title">
      <header>
        <div>
          <p className="eyebrow">Deterministic timeline</p>
          <h2 id="scenario-progress-title">Progress</h2>
        </div>
        <strong>{progress.toFixed(0)}%</strong>
      </header>
      <div
        className="scenario-progress-track"
        role="progressbar"
        aria-label="Scenario progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <dl className="scenario-progress-meta">
        <div>
          <dt>Elapsed</dt>
          <dd>{formatScenarioDuration(state.elapsedMs)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatScenarioDuration(state.definition?.durationMs ?? 0)}</dd>
        </div>
        <div>
          <dt>Remaining events</dt>
          <dd>{selectRemainingEventCount(state)}</dd>
        </div>
      </dl>
      <div className="scenario-upcoming">
        <h3>Next scheduled events</h3>
        {upcomingEvents.length === 0 ? (
          <p>No scheduled events remain.</p>
        ) : (
          <ol>
            {upcomingEvents.map((event, index) => (
              <li key={`${event.atMs}-${event.type}-${index}`}>
                <time>{formatScenarioDuration(event.atMs)}</time>
                <span>
                  <strong>{event.label}</strong>
                  {formatEventType(event.type)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
