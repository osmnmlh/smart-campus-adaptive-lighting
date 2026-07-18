export function AlertsHeader() {
  return (
    <header className="activity-header">
      <div>
        <p className="eyebrow">Deterministic operational history</p>
        <h1>Alerts</h1>
        <p>Inspect simulated alert history without changing incident or device state.</p>
      </div>
      <div className="activity-provenance" aria-label="Alert data provenance">
        <strong>SIMULATED</strong>
        <span>Data source: SIMULATED</span>
        <span>Deterministic demo history</span>
        <span>No live backend connection</span>
        <span>Not production incidents</span>
      </div>
    </header>
  );
}
