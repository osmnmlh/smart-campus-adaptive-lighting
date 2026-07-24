export function LogsErrorState({
  message,
  live = false,
}: Readonly<{ message: string; live?: boolean }>) {
  return (
    <section className="activity-error" role="status" aria-live="polite">
      <h2>Log history is unavailable</h2>
      <p>{message}</p>
      <p>
        {live
          ? 'Live records were not presented and no mock fallback was used.'
          : 'The simulated fixture was not presented. No network retry is required.'}
      </p>
    </section>
  );
}
