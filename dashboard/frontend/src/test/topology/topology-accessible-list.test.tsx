import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { TopologyAccessibleList } from '@/components/topology/topology-accessible-list';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';

const graph = createTopologyGraph(topologySnapshot);

describe('TopologyAccessibleList', () => {
  it('renders visible entities and user-opened relationship sections', () => {
    render(<TopologyAccessibleList graph={graph} selectedEntityId={null} onSelect={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Topology List' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Controllers' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Lamps' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Sensors' })).toBeVisible();
    const relationships = screen.getByText('Relationship details').closest('details');
    expect(relationships).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Relationship details').closest('summary')!);
    expect(screen.getByRole('heading', { name: 'Relationships' })).toBeVisible();
    expect(screen.getByText(/controller:node-1 → controller:node-2/)).toBeVisible();
    expect(screen.getByText(/System ambient sensor/)).toBeVisible();
  });

  it('exposes all 14 entities as keyboard-accessible buttons', () => {
    render(<TopologyAccessibleList graph={graph} selectedEntityId={null} onSelect={() => {}} />);
    const list = screen.getByRole('heading', { name: 'Topology List' }).closest('section');
    if (!list) throw new Error('Topology List section missing');

    expect(within(list).getAllByRole('button')).toHaveLength(14);
    expect(within(list).getByRole('button', { name: /NODE_1/ })).toBeEnabled();
    expect(within(list).getByRole('button', { name: /L3/ })).toBeEnabled();
    expect(within(list).getByRole('button', { name: /IR3/ })).toBeEnabled();
  });

  it('sends deterministic entity IDs through the shared selection callback', () => {
    const onSelect = vi.fn();
    render(<TopologyAccessibleList graph={graph} selectedEntityId={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /L3/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('lamp:lamp-3');
  });
});
