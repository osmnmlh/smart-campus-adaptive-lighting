import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';

const pathnameMock = vi.mocked(usePathname);

beforeEach(() => {
  pathnameMock.mockReturnValue('/');
});

describe('metrics navigation', () => {
  it('links all available dashboard routes', () => {
    render(
      <AppShell>
        <p>Metrics content</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Topology' })).toHaveAttribute('href', '/topology');
    expect(screen.getByRole('link', { name: 'Metrics' })).toHaveAttribute('href', '/metrics');
    expect(screen.getByRole('link', { name: 'Scenarios' })).toHaveAttribute('href', '/scenarios');
    expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: 'Logs' })).toHaveAttribute('href', '/logs');
  });

  it('keeps the dashboard navigation accessible', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByText('Overview, Topology, Metrics and Scenarios')).toBeVisible();
  });

  it.each([
    { pathname: '/', currentLabel: 'Overview' },
    { pathname: '/topology', currentLabel: 'Topology' },
    { pathname: '/metrics', currentLabel: 'Metrics' },
    { pathname: '/scenarios', currentLabel: 'Scenarios' },
    { pathname: '/alerts', currentLabel: 'Alerts' },
    { pathname: '/logs', currentLabel: 'Logs' },
  ])('marks only $currentLabel as current on $pathname', ({ pathname, currentLabel }) => {
    pathnameMock.mockReturnValue(pathname);
    render(<AppShell>content</AppShell>);

    const links = screen.getAllByRole('link');
    expect(screen.getByRole('link', { name: currentLabel })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
    links
      .filter((link) => link.textContent !== currentLabel)
      .forEach((link) => expect(link).not.toHaveAttribute('aria-current'));
  });
});
