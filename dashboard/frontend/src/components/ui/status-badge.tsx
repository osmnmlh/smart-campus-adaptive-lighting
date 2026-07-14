type StatusTone = 'ready' | 'pending' | 'neutral';

type StatusBadgeProps = Readonly<{
  label: string;
  tone?: StatusTone;
}>;

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-tone={tone}>
      <span className="status-indicator" aria-hidden="true">
        ●
      </span>
      <span>{label}</span>
    </span>
  );
}
