export function TopologyLegend() {
  return (
    <section className="topology-legend" aria-labelledby="topology-legend-title">
      <div>
        <p className="eyebrow">Reference</p>
        <h2 id="topology-legend-title">Topology legend</h2>
        <p>Text labels distinguish entity health, operating state, and relationship meaning.</p>
      </div>
      <div className="legend-groups">
        <dl>
          <div>
            <dt>Controller Node</dt>
            <dd>ESP32 controller and communication health</dd>
          </div>
          <div>
            <dt>Lamp</dt>
            <dd>Operating state and brightness</dd>
          </div>
          <div>
            <dt>Sensor</dt>
            <dd>Activity, source, and metric quality</dd>
          </div>
        </dl>
        <dl>
          <div>
            <dt>Communication</dt>
            <dd>Bidirectional controller link</dd>
          </div>
          <div>
            <dt>Ownership</dt>
            <dd>Controller → lamp</dd>
          </div>
          <div>
            <dt>Sensing</dt>
            <dd>Sensor → lighting segment</dd>
          </div>
        </dl>
        <dl>
          <div>
            <dt>Online / Healthy</dt>
            <dd>Normal health state</dd>
          </div>
          <div>
            <dt>Degraded / Warning</dt>
            <dd>Attention required</dd>
          </div>
          <div>
            <dt>Offline / Fault</dt>
            <dd>Unavailable or faulted</dd>
          </div>
          <div>
            <dt>Active / Pre-light / Standby</dt>
            <dd>Lamp operating state, not health</dd>
          </div>
        </dl>
      </div>
      <p className="legend-source-note">Simulated data · Not production telemetry</p>
    </section>
  );
}
