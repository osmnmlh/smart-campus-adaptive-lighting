export function LogsEmptyState({
  fixtureEmpty,
  onClear,
  live = false,
}: Readonly<{ fixtureEmpty: boolean; onClear: () => void; live?: boolean }>) {
  return (
    <div className="activity-empty">
      <h3>
        {fixtureEmpty
          ? `No ${live ? 'backend' : 'simulated'} log records are available`
          : 'No logs match the selected filters'}
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
