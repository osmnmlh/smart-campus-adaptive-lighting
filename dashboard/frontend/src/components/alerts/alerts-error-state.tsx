'use client';

import { useLocalization } from '@/features/localization/use-localization';

export function AlertsErrorState({
  message,
  live = false,
}: Readonly<{ message: string; live?: boolean }>) {
  const { t } = useLocalization();
  return (
    <section className="activity-error" role="status" aria-live="polite">
      <h2>{t('alerts.unavailable')}</h2>
      <p>{message}</p>
      <p>{live ? t('alerts.liveFailure') : t('alerts.simulatedFailure')}</p>
    </section>
  );
}
