import type { ScenarioCatalogItem, ScenarioId } from '@/features/scenarios/scenario-model';
import { formatScenarioDuration } from '@/features/scenarios/scenario-formatters';

type ScenarioSelectorProps = Readonly<{
  items: readonly ScenarioCatalogItem[];
  selectedId: ScenarioId | null;
  disabled?: boolean;
  onSelect: (scenarioId: ScenarioId) => void;
}>;

export function ScenarioSelector({
  items,
  selectedId,
  disabled = false,
  onSelect,
}: ScenarioSelectorProps) {
  return (
    <fieldset className="scenario-selector" disabled={disabled}>
      <legend>Choose a local scenario</legend>
      <div className="scenario-selector-grid">
        {items.map(({ id, definition, eventCount }) => (
          <label key={id} className="scenario-option" data-selected={selectedId === id}>
            <input
              type="radio"
              name="scenario"
              value={id}
              checked={selectedId === id}
              onChange={() => onSelect(id)}
            />
            <span className="scenario-option-heading">
              <strong>{definition.name}</strong>
              <span>{formatScenarioDuration(definition.durationMs)}</span>
            </span>
            <span>{definition.description}</span>
            <small>{eventCount} scheduled events</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
