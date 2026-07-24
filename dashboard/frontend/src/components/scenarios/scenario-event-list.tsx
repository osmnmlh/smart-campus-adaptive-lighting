'use client';

import { formatScenarioDuration, formatEventType } from '@/features/scenarios/scenario-formatters';
import type { PresentationEvent } from '@/features/scenarios/scenario-model';
import { useLocalization } from '@/features/localization/use-localization';

export function ScenarioEventList({ events }: Readonly<{ events: readonly PresentationEvent[] }>) {
  const { t } = useLocalization();
  return (
    <section className="scenario-event-card" aria-labelledby="scenario-events-title">
      <header>
        <div>
          <p className="eyebrow">{t('scenarios.recentFirst')}</p>
          <h2 id="scenario-events-title">{t('scenarios.presentationEvents')}</h2>
        </div>
        <span>{events.length} / 10</span>
      </header>
      {events.length === 0 ? (
        <p className="scenario-empty-list">{t('scenarios.createEvents')}</p>
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
