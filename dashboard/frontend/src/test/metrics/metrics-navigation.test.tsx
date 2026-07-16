import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppShell } from '@/components/app-shell';

describe('metrics navigation', () => {
  it('links Overview, Topology, and Metrics routes', () => {
    render(
      <AppShell>
        <p>Metrics content</p>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Topology' })).toHaveAttribute('href', '/topology');
    expect(screen.getByRole('link', { name: 'Metrics' })).toHaveAttribute('href', '/metrics');
  });

  it('does not add unavailable route links', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.queryByRole('link', { name: 'Alerts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Logs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Scenarios' })).not.toBeInTheDocument();
  });

  it('keeps the dashboard navigation accessible', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByText('Overview, Topology and Metrics')).toBeVisible();
  });
});
