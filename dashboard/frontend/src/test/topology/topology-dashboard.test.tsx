import { fireEvent, render, screen, within } from '@testing-library/react';
import { TopologyDashboard } from '@/components/topology/topology-dashboard';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';

const graph = createTopologyGraph(topologySnapshot);

const topologyList = () => {
  const list = screen.getByRole('heading', { name: 'Topology List' }).closest('section');
  if (!list) throw new Error('Topology List section missing');
  return within(list);
};

describe('TopologyDashboard', () => {
  it('renders the topology heading, simulated label, canvas, legend, and all entity labels', () => {
    render(<TopologyDashboard initialGraph={graph} />);

    expect(screen.getByRole('heading', { level: 1, name: 'System Topology' })).toBeVisible();
    expect(screen.getByText('Simulated Data')).toBeVisible();
    expect(screen.getByLabelText('Interactive system topology canvas')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Topology legend' })).toBeVisible();
    expect(topologyList().getAllByRole('button')).toHaveLength(14);
    expect(topologyList().getByRole('button', { name: /NODE_3/ })).toBeVisible();
    expect(topologyList().getByRole('button', { name: /L5/ })).toBeVisible();
    expect(topologyList().getByRole('button', { name: /BH1750/ })).toBeVisible();
  });

  it('shares L3 selection between the list, graph focus, and detail panel', () => {
    render(<TopologyDashboard initialGraph={graph} />);

    fireEvent.click(topologyList().getByRole('button', { name: /L3/ }));
    const detail = screen.getByRole('complementary');

    expect(within(detail).getByRole('heading', { name: 'L3' })).toBeVisible();
    expect(detail).toHaveTextContent('L2, L4');
    expect(topologyList().getByRole('button', { name: /L3/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clears selection through the shared toolbar control', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    const clear = screen.getByRole('button', { name: 'Clear Selection' });

    expect(clear).toBeDisabled();
    fireEvent.click(topologyList().getByRole('button', { name: /IR2/ }));
    expect(clear).toBeEnabled();
    fireEvent.click(clear);

    expect(screen.getByRole('heading', { name: 'Select a node, lamp, or sensor' })).toBeVisible();
    expect(topologyList().getByRole('button', { name: /IR2/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('provides text-labeled fit and reset controls without command actions', () => {
    render(<TopologyDashboard initialGraph={graph} />);

    expect(screen.getByRole('button', { name: 'Fit View' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset View' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /turn on|restart|acknowledge|send command/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Online \/ Healthy/)).toBeVisible();
    expect(screen.getByText(/Active \/ Pre-light \/ Standby/)).toBeVisible();
  });
});
