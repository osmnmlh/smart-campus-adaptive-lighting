import { EnvironmentStatus } from '@/components/environment-status';
import { StatusBadge } from '@/components/ui/status-badge';

const phaseStatuses = [
  { label: 'Frontend', status: 'Hazır', tone: 'ready' },
  { label: 'Shared Contracts', status: 'Bağlı', tone: 'ready' },
  { label: 'Backend', status: 'Henüz scaffold edilmedi', tone: 'pending' },
  { label: 'Telemetry Source', status: 'Bağlı değil', tone: 'pending' },
  { label: 'Current Phase', status: 'Frontend Scaffold', tone: 'neutral' },
] as const;

export default function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Sistem izleme altyapısı</p>
        <h1 id="page-title">Smart Campus Adaptive Lighting Dashboard</h1>
        <p className="hero-description">
          Adaptif aydınlatma sisteminin izleme ve troubleshooting arayüzü.
        </p>
        <p className="scope-note">
          Bu ekran yalnızca frontend scaffold durumunu gösterir; canlı sistem verisi içermez.
        </p>
      </section>

      <section aria-labelledby="phase-status-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Kurulum durumu</p>
            <h2 id="phase-status-title">Frontend çalışma alanı</h2>
          </div>
          <StatusBadge label="Scaffold hazır" tone="ready" />
        </div>

        <div className="status-grid">
          {phaseStatuses.map((item) => (
            <article className="status-card" key={item.label}>
              <h3>{item.label}</h3>
              <StatusBadge label={item.status} tone={item.tone} />
            </article>
          ))}
        </div>
      </section>

      <EnvironmentStatus />
    </div>
  );
}
