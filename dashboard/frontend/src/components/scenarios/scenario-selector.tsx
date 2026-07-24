'use client';

import type { ScenarioCatalogItem, ScenarioId } from '@/features/scenarios/scenario-model';
import { useLocalization } from '@/features/localization/use-localization';
import type { TranslationKey } from '@/features/localization/messages';

export function ScenarioSelector({
  items,
  selectedId,
  disabled = false,
  onSelect,
}: Readonly<{
  items: readonly ScenarioCatalogItem[];
  selectedId: ScenarioId | null;
  disabled?: boolean;
  onSelect: (scenarioId: ScenarioId) => void;
}>) {
  const { t, formatDuration } = useLocalization();
  return (
    <fieldset className="scenario-selector" disabled={disabled}>
      <legend>{t('scenarios.choose')}</legend>
      <div className="scenario-selector-grid">
        {items.map(({ id, definition, eventCount, simulated }) => (
          <label key={id} className="scenario-option" data-selected={selectedId === id}>
            <input
              type="radio"
              name="scenario"
              value={id}
              checked={selectedId === id}
              onChange={() => onSelect(id)}
            />
            <span className="scenario-option-heading">
              <strong>{t(`scenario.${id}.name` as TranslationKey)}</strong>
              <span>{formatDuration(definition.durationMs)}</span>
            </span>
            <span>{t(`scenario.${id}.description` as TranslationKey)}</span>
            <small>
              {t('scenarios.events', {
                count: eventCount,
                source: simulated ? 'SIMULATED' : 'UNAVAILABLE',
              })}
            </small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
