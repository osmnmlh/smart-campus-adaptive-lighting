import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  OctagonAlert,
  type LucideIcon,
} from 'lucide-react';

export type StatusTone = 'ready' | 'pending' | 'neutral' | 'warning' | 'critical';

type StatusBadgeProps = Readonly<{
  label: string;
  tone?: StatusTone;
  icon?: LucideIcon;
}>;

const defaultIcons: Readonly<Record<StatusTone, LucideIcon>> = {
  ready: CheckCircle2,
  pending: Clock,
  neutral: Circle,
  warning: AlertTriangle,
  critical: OctagonAlert,
};

export function StatusBadge({ label, tone = 'neutral', icon }: StatusBadgeProps) {
  const Icon = icon ?? defaultIcons[tone];

  return (
    <span className="status-badge" data-tone={tone}>
      <Icon
        className="status-indicator"
        size={14}
        strokeWidth={2.25}
        aria-hidden="true"
        focusable="false"
      />
      <span>{label}</span>
    </span>
  );
}
