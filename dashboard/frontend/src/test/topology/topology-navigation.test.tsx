import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/app-shell';

describe('topology navigation', () => {
  it('links Overview to the root route', () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/');
  });

  it('links Topology to the topology route', () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole('link', { name: 'Topology' })).toHaveAttribute('href', '/topology');
  });

  it('advertises Metrics and Scenarios but no unavailable routes', () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.getByRole('link', { name: 'Metrics' })).toHaveAttribute('href', '/metrics');
    expect(screen.getByRole('link', { name: 'Scenarios' })).toHaveAttribute('href', '/scenarios');
    expect(screen.queryByRole('link', { name: 'Alerts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Logs' })).not.toBeInTheDocument();
  });
});
