'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { href: '/', label: 'Overview' },
  { href: '/topology', label: 'Topology' },
  { href: '/metrics', label: 'Metrics' },
  { href: '/scenarios', label: 'Scenarios' },
] as const;

function isCurrentRoute(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="app-navigation" aria-label="Dashboard navigation">
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isCurrentRoute(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
