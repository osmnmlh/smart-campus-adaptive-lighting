import { formatScenarioDuration, formatEventType } from '@/features/scenarios/scenario-formatters';
import type { PresentationEvent } from '@/features/scenarios/scenario-model';

export function ScenarioEventList({ events }: Readonly<{ events: readonly PresentationEvent[] }>) {
  return (
    <section className="scenario-event-card" aria-labelledby="scenario-events-title">
      <header>
        <div>
          <p className="eyebrow">Most recent first</p>
          <h2 id="scenario-events-title">Presentation events</h2>
        </div>
        <span>{events.length} / 10</span>
      </header>
      {events.length === 0 ? (
        <p className="scenario-empty-list">
          Start the scenario to create local presentation events.
        </p>
      ) : (
        <ol aria-live="polite" reversed>
          {[...events].reverse().map((event) => (
            <li key={event.id}>
              <time>{formatScenarioDuration(event.atMs)}</time>
              <div>
                <strong>{event.label}</strong>
                <span>{event.detail}</span>
              </div>
              <small>{formatEventType(event.type)}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
