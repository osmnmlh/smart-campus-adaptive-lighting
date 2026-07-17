import type { CommunicationStatusItem } from '@/features/metrics/metrics-model';
import { formatMetricTimestamp } from '@/features/metrics/metrics-formatters';

export function CommunicationStatusSummary({
  items,
}: Readonly<{ items: readonly CommunicationStatusItem[] }>) {
  return (
    <section className="metrics-summary-card" aria-labelledby="communication-summary-title">
      <header>
        <p className="eyebrow">Node snapshot</p>
        <h2 id="communication-summary-title">Communication status</h2>
      </header>
      <ul className="communication-status-list">
        {items.map((item) => (
          <li key={item.nodeId}>
            <strong>{item.label}</strong>
            <span>Communication: {item.communicationHealth}</span>
            <span>Node health: {item.nodeHealth}</span>
            <span>{formatMetricTimestamp(item.latestTimestamp)}</span>
            <small>{item.source} snapshot</small>
          </li>
        ))}
      </ul>
      <p>No live connectivity, latency, packet-loss, or RSSI claim is made.</p>
    </section>
  );
}
