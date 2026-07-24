import type { ReactNode } from 'react';
import { AppNavigation } from './app-navigation';
import { DashboardConnectionStatus } from './dashboard-connection-status';

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span>Smart Campus Adaptive Lighting Dashboard</span>
          </div>
          <DashboardConnectionStatus />
          <AppNavigation />
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>Smart Campus Adaptive Lighting</span>
          <span>Overview, Topology, Metrics and Scenarios</span>
        </div>
      </footer>
    </div>
  );
}
