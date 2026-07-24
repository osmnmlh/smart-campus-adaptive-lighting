export function LogsHeader({ live = false }: Readonly<{ live?: boolean }>) {
  return (
    <header className="activity-header">
      <div>
        <p className="eyebrow">
          {live ? 'Backend operational stream' : 'Deterministic operational history'}
        </p>
        <h1>Logs</h1>
        <p>
          Inspect {live ? 'read-only backend' : 'simulated'} system activity without changing
          scenario or device state.
        </p>
      </div>
      <div className="activity-provenance" aria-label="Log data provenance">
        <strong>{live ? 'BACKEND' : 'SIMULATED'}</strong>
        <span>{live ? 'Validated REST and realtime records' : 'Data source: SIMULATED'}</span>
        <span>{live ? 'Read-only display' : 'Deterministic demo history'}</span>
        <span>{live ? 'Realtime append enabled' : 'No live stream'}</span>
        <span>{live ? 'Backend mode shown in header' : 'Not production audit records'}</span>
      </div>
    </header>
  );
}
