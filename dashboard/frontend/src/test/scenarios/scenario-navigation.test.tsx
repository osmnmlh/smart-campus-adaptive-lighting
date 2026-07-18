import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { beforeEach, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';

const pathnameMock = vi.mocked(usePathname);

beforeEach(() => pathnameMock.mockReturnValue('/scenarios'));

describe('scenario navigation', () => {
  it('links exactly the six implemented dashboard routes', () => {
    render(<AppShell>Scenario content</AppShell>);
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Topology' })).toHaveAttribute('href', '/topology');
    expect(screen.getByRole('link', { name: 'Metrics' })).toHaveAttribute('href', '/metrics');
    expect(screen.getByRole('link', { name: 'Scenarios' })).toHaveAttribute('href', '/scenarios');
    expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute('href', '/alerts');
    expect(screen.getByRole('link', { name: 'Logs' })).toHaveAttribute('href', '/logs');
    expect(screen.getByText('Overview, Topology, Metrics and Scenarios')).toBeVisible();
  });

  it('marks only Scenarios current on the route and nested route', () => {
    const { rerender } = render(<AppShell>Scenario content</AppShell>);
    const scenarioLink = screen.getByRole('link', { name: 'Scenarios' });
    expect(scenarioLink).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Topology' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Metrics' })).not.toHaveAttribute('aria-current');
    pathnameMock.mockReturnValue('/scenarios/local-preview');
    rerender(<AppShell>Nested scenario content</AppShell>);
    expect(screen.getByRole('link', { name: 'Scenarios' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Nested scenario content')).toBeVisible();
  });

  it('does not mark Scenarios current on another route', () => {
    pathnameMock.mockReturnValue('/metrics');
    render(<AppShell>Metrics content</AppShell>);
    expect(screen.getByRole('link', { name: 'Metrics' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Scenarios' })).not.toHaveAttribute('aria-current');
    expect(
      screen.getAllByRole('link').filter((link) => link.hasAttribute('aria-current')),
    ).toHaveLength(1);
  });
});
