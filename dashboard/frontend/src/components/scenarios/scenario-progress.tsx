import type { ScenarioControllerState } from '@/features/scenarios/scenario-model';
import { formatEventType } from '@/features/scenarios/scenario-formatters';
import {
  selectProgressPercent,
  selectRemainingEventCount,
  selectUpcomingEvents,
} from '@/features/scenarios/scenario-selectors';
import { useLocalization } from '@/features/localization/use-localization';

export function ScenarioProgress({ state }: Readonly<{ state: ScenarioControllerState }>) {
  const { t, formatDuration, formatNumber } = useLocalization();
  const progress = selectProgressPercent(state);
  const upcomingEvents = selectUpcomingEvents(state);
  return (
    <section className="scenario-progress-card" aria-labelledby="scenario-progress-title">
      <header>
        <div>
          <p className="eyebrow">{t('scenarios.timeline')}</p>
          <h2 id="scenario-progress-title">{t('scenarios.progress')}</h2>
        </div>
        <strong>{formatNumber(progress)}%</strong>
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
          <dt>{t('scenarios.elapsed')}</dt>
          <dd>{formatDuration(state.elapsedMs)}</dd>
        </div>
        <div>
          <dt>{t('scenarios.duration')}</dt>
          <dd>{formatDuration(state.definition?.durationMs ?? 0)}</dd>
        </div>
        <div>
          <dt>{t('scenarios.remaining')}</dt>
          <dd>{selectRemainingEventCount(state)}</dd>
        </div>
      </dl>
      <div className="scenario-upcoming">
        <h3>{t('scenarios.nextEvents')}</h3>
        {upcomingEvents.length === 0 ? (
          <p>{t('scenarios.noEvents')}</p>
        ) : (
          <ol>
            {upcomingEvents.map((event, index) => (
              <li key={`${event.atMs}-${event.type}-${index}`}>
                <time>{formatDuration(event.atMs)}</time>
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
