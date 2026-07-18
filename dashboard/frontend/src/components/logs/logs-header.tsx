export function LogsHeader() {
  return (
    <header className="activity-header">
      <div>
        <p className="eyebrow">Deterministic operational history</p>
        <h1>Logs</h1>
        <p>Inspect simulated system activity without changing scenario or device state.</p>
      </div>
      <div className="activity-provenance" aria-label="Log data provenance">
        <strong>SIMULATED</strong>
        <span>Data source: SIMULATED</span>
        <span>Deterministic demo history</span>
        <span>No live stream</span>
        <span>Not production audit records</span>
      </div>
    </header>
  );
}
