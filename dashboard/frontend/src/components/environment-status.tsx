import { StatusBadge } from '@/components/ui/status-badge';
import { contractsSmoke } from '@/lib/contracts-smoke';
import { publicEnv } from '@/lib/env';

export function EnvironmentStatus() {
  const contractsReady =
    contractsSmoke.validatesSystemMode && contractsSmoke.systemSnapshotSchemaAvailable;

  return (
    <section className="environment-panel" aria-labelledby="environment-title">
      <header className="environment-header">
        <p className="eyebrow">Çalışma ortamı</p>
        <h2 id="environment-title">Bağlantı yapılandırması</h2>
        <p>Bu değerler public frontend veri modu ve bağlantı yapılandırmasıdır.</p>
      </header>

      <dl className="environment-list">
        <div className="environment-item">
          <dt>Data mode</dt>
          <dd>
            <code>{publicEnv.dataMode}</code>
          </dd>
        </div>
        <div className="environment-item">
          <dt>API URL</dt>
          <dd>
            <code>{publicEnv.apiUrl}</code>
          </dd>
        </div>
        <div className="environment-item">
          <dt>WebSocket URL</dt>
          <dd>
            <code>{publicEnv.webSocketUrl}</code>
          </dd>
        </div>
        <div className="environment-item">
          <dt>Contracts package</dt>
          <dd>
            <StatusBadge
              label={contractsReady ? 'Erişilebilir' : 'Erişilemiyor'}
              tone={contractsReady ? 'ready' : 'pending'}
            />
          </dd>
        </div>
        <div className="environment-item">
          <dt>Frontend scaffold</dt>
          <dd>
            <StatusBadge label="Hazır" tone="ready" />
          </dd>
        </div>
      </dl>
    </section>
  );
}
