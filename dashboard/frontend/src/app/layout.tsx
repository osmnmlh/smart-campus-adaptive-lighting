import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { DashboardDataProvider } from '@/features/live-data/dashboard-data-provider';
import { LocalizationProvider } from '@/features/localization/localization-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Campus Adaptive Lighting Dashboard',
  description: 'Adaptif aydınlatma sisteminin izleme ve troubleshooting arayüzü.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <LocalizationProvider>
          <DashboardDataProvider>
            <AppShell>{children}</AppShell>
          </DashboardDataProvider>
        </LocalizationProvider>
      </body>
    </html>
  );
}
