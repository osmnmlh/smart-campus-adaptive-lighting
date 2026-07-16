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

  it('does not advertise routes that do not exist yet', () => {
    render(<AppShell>Content</AppShell>);

    expect(screen.queryByRole('link', { name: 'Metrics' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Alerts' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Logs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Scenarios' })).not.toBeInTheDocument();
  });
});
