'use client';

import type { ReactNode } from 'react';
import { AppNavigation } from './app-navigation';
import { DashboardConnectionStatus } from './dashboard-connection-status';
import { LanguageSelector } from './language-selector';
import { useLocalization } from '@/features/localization/use-localization';

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  const { t } = useLocalization();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>Smart Campus Adaptive Lighting Dashboard</span>
          </div>
          <DashboardConnectionStatus />
          <LanguageSelector />
          <AppNavigation />
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>Smart Campus Adaptive Lighting</span>
          <span>{t('shell.footer')}</span>
        </div>
      </footer>
    </div>
  );
}
