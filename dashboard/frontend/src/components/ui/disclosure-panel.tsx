import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

type DisclosurePanelProps = Readonly<{
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  icon?: ReactNode;
  count?: string | number;
}>;

export function DisclosurePanel({
  title,
  description,
  children,
  defaultOpen = false,
  className = '',
  contentClassName = '',
  icon,
  count,
}: DisclosurePanelProps) {
  return (
    <details className={`disclosure-panel ${className}`.trim()} open={defaultOpen}>
      <summary className="disclosure-panel__summary">
        {icon ? (
          <span className="disclosure-panel__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="disclosure-panel__heading">
          <span className="disclosure-panel__title">{title}</span>
          {description ? (
            <span className="disclosure-panel__description">{description}</span>
          ) : null}
        </span>
        {count === undefined ? null : <span className="disclosure-panel__count">{count}</span>}
        <ChevronDown
          className="disclosure-panel__chevron"
          size={20}
          strokeWidth={2.25}
          aria-hidden="true"
          focusable="false"
        />
      </summary>
      <div className={`disclosure-panel__content ${contentClassName}`.trim()}>{children}</div>
    </details>
  );
}
