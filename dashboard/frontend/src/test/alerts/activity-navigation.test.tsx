import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';

const pathnameMock = vi.mocked(usePathname);

beforeEach(() => pathnameMock.mockReturnValue('/alerts'));

describe('alerts and logs navigation', () => {
  it('shows exactly six implemented route links', () => {
    render(<AppShell>Activity content</AppShell>);
    expect(screen.getAllByRole('link')).toHaveLength(6);
  });
  it.each([
    ['Overview', '/'],
    ['Topology', '/topology'],
    ['Metrics', '/metrics'],
    ['Scenarios', '/scenarios'],
    ['Alerts', '/alerts'],
    ['Logs', '/logs'],
  ])('links %s to %s', (label, href) => {
    render(<AppShell>Activity content</AppShell>);
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
  });
  it('marks Alerts current on its route and nested routes', () => {
    const { rerender } = render(<AppShell>Alerts content</AppShell>);
    expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute('aria-current', 'page');
    pathnameMock.mockReturnValue('/alerts/ALERT_SIM_001');
    rerender(<AppShell>Alert detail</AppShell>);
    expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute('aria-current', 'page');
  });
  it('marks Logs current without also marking Alerts', () => {
    pathnameMock.mockReturnValue('/logs');
    render(<AppShell>Logs content</AppShell>);
    expect(screen.getByRole('link', { name: 'Logs' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Alerts' })).not.toHaveAttribute('aria-current');
  });
  it('preserves the existing footer copy', () => {
    render(<AppShell>Activity content</AppShell>);
    expect(screen.getByText('Overview, Topology, Metrics and Scenarios')).toBeVisible();
  });
});
