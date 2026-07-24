'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocalization } from '@/features/localization/use-localization';

const navigationItems = [
  { href: '/', key: 'nav.overview' },
  { href: '/topology', key: 'nav.topology' },
  { href: '/metrics', key: 'nav.metrics' },
  { href: '/scenarios', key: 'nav.scenarios' },
  { href: '/alerts', key: 'nav.alerts' },
  { href: '/logs', key: 'nav.logs' },
] as const;

function isCurrentRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();
  const { t } = useLocalization();

  return (
    <nav className="app-navigation" aria-label={t('nav.label')}>
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrentRoute(pathname, item.href) ? 'page' : undefined}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
