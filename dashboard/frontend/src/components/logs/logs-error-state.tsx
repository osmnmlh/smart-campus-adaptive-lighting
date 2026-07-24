'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function LogsErrorState({
  message,
  live = false,
}: Readonly<{ message: string; live?: boolean }>) {
  const { t } = useLocalization();
  return (
    <section className="activity-error" role="status" aria-live="polite">
      <h2>{t('logs.unavailable')}</h2>
      <p>{message}</p>
      <p>{live ? t('logs.liveFailure') : t('logs.simulatedFailure')}</p>
    </section>
  );
}
