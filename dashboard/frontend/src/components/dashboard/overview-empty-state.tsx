type OverviewEmptyStateProps = Readonly<{
  variant?: 'empty' | 'error';
  message?: string;
}>;

export function OverviewEmptyState({
  variant = 'empty',
  message = 'No overview snapshot is available.',
}: OverviewEmptyStateProps) {
  const isError = variant === 'error';

  return (
    <section className="overview-state" role={isError ? 'alert' : 'status'}>
      <p className="eyebrow">{isError ? 'Overview unavailable' : 'No snapshot'}</p>
      <h1>{isError ? 'Dashboard data could not be prepared' : 'Overview is empty'}</h1>
      <p>{message}</p>
    </section>
  );
}
