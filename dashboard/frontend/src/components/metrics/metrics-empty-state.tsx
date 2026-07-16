export function MetricsEmptyState({
  title,
  message,
}: Readonly<{ title: string; message: string }>) {
  return (
    <section className="metrics-empty-state" role="status">
      <p className="eyebrow">Safe metrics state</p>
      <h2>{title}</h2>
      <p>{message}</p>
      <p>No network retry or automatic refresh is performed.</p>
    </section>
  );
}
