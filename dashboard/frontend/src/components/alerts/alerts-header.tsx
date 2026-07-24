export function AlertsHeader({ live = false }: Readonly<{ live?: boolean }>) {
  return (
    <header className="activity-header">
      <div>
        <p className="eyebrow">
          {live ? 'Backend operational history' : 'Deterministic operational history'}
        </p>
        <h1>Alerts</h1>
        <p>
          Inspect {live ? 'read-only backend' : 'simulated'} alert history without changing incident
          or device state.
        </p>
      </div>
      <div className="activity-provenance" aria-label="Alert data provenance">
        <strong>{live ? 'BACKEND' : 'SIMULATED'}</strong>
        <span>{live ? 'Validated REST and realtime records' : 'Data source: SIMULATED'}</span>
        <span>{live ? 'Read-only display' : 'Deterministic demo history'}</span>
        <span>{live ? 'No incident mutations' : 'No live backend connection'}</span>
        <span>{live ? 'Backend mode shown in header' : 'Not production incidents'}</span>
      </div>
    </header>
  );
}
