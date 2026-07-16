import type { ReactNode } from 'react';

type SectionCardProps = Readonly<{
  title: string;
  description: string;
  titleId: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}>;

export function SectionCard({
  title,
  description,
  titleId,
  action,
  children,
  className = '',
  ariaLabel,
}: SectionCardProps) {
  return (
    <section
      className={`section-card ${className}`.trim()}
      aria-labelledby={ariaLabel ? undefined : titleId}
      aria-label={ariaLabel}
    >
      <header className="section-card-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        {action}
      </header>
      <div className="section-card-body">{children}</div>
    </section>
  );
}
