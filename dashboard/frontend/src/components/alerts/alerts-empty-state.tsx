export function AlertsEmptyState({
  fixtureEmpty,
  onClear,
}: Readonly<{ fixtureEmpty: boolean; onClear: () => void }>) {
  return (
    <div className="activity-empty">
      <h3>
        {fixtureEmpty
          ? 'No simulated alert records are available'
          : 'No alerts match the selected filters'}
      </h3>
      <p>
        {fixtureEmpty
          ? 'The deterministic fixture is empty.'
          : 'Choose another filter combination or clear the current filters.'}
      </p>
      {fixtureEmpty ? null : (
        <button type="button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
