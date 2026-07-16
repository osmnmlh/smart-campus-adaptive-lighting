import { MetricValue } from '@/components/ui/metric-value';
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge';

type SummaryCardProps = Readonly<{
  label: string;
  value: string | number;
  detail: string;
  statusLabel?: string;
  tone?: StatusTone;
}>;

export function SummaryCard({
  label,
  value,
  detail,
  statusLabel,
  tone = 'neutral',
}: SummaryCardProps) {
  return (
    <article className="summary-card" aria-label={`${label} summary`}>
      <div className="summary-card-topline">
        <p>{label}</p>
        {statusLabel ? <StatusBadge label={statusLabel} tone={tone} /> : null}
      </div>
      <MetricValue value={value} label={detail} />
    </article>
  );
}
