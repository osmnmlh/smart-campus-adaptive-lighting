import type { ReactNode } from 'react';

type MetricChartCardProps = Readonly<{
  title: string;
  description: string;
  meta: string;
  className?: string;
  children: ReactNode;
}>;

export function MetricChartCard({
  title,
  description,
  meta,
  className = '',
  children,
}: MetricChartCardProps) {
  return (
    <section className={`metric-chart-card ${className}`.trim()} aria-label={title}>
      <header>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span>{meta}</span>
      </header>
      {children}
    </section>
  );
}
