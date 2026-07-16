import { render, screen, within } from '@testing-library/react';
import { NodeStatusList } from '@/components/dashboard/node-status-list';
import { createOverviewModel } from '@/features/overview/overview-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

const nodes = createOverviewModel(overviewSnapshot).nodes;

describe('NodeStatusList', () => {
  it('renders three canonical node labels as table rows', () => {
    render(<NodeStatusList nodes={nodes} />);
    const table = screen.getByRole('table');

    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('NODE_1')).toBeVisible();
    expect(within(table).getByText('NODE_2')).toBeVisible();
    expect(within(table).getByText('NODE_3')).toBeVisible();
  });

  it('shows the deterministic lamp ownership mapping', () => {
    render(<NodeStatusList nodes={nodes} />);
    const table = screen.getByRole('table');

    expect(within(table).getByText('L1, L2')).toBeVisible();
    expect(within(table).getByText('L3')).toBeVisible();
    expect(within(table).getByText('L4, L5')).toBeVisible();
  });

  it('communicates health, connectivity, and update time in text', () => {
    render(<NodeStatusList nodes={nodes} />);
    const table = screen.getByRole('table');

    expect(within(table).getAllByText('Healthy')).toHaveLength(6);
    expect(within(table).getAllByText('Online')).toHaveLength(3);
    expect(within(table).getAllByText('2026-06-15 20:30 UTC')).toHaveLength(3);
  });
});
