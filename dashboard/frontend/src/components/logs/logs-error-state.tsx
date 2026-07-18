export function LogsErrorState({ message }: Readonly<{ message: string }>) {
  return (
    <section className="activity-error" role="status" aria-live="polite">
      <h2>Log history is unavailable</h2>
      <p>{message}</p>
      <p>The simulated fixture was not presented. No network retry is required.</p>
    </section>
  );
}
