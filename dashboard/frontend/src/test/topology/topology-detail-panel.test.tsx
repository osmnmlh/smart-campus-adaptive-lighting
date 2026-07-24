import { render, screen, within } from '@testing-library/react';
import { TopologyDetailPanel } from '@/components/topology/topology-detail-panel';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';
import { topologyEntityByLabel } from '@/features/topology/topology-selectors';

const graph = createTopologyGraph(topologySnapshot);

describe('TopologyDetailPanel', () => {
  it('shows an explanatory no-selection state', () => {
    render(<TopologyDetailPanel detail={null} />);

    expect(screen.getByRole('heading', { name: 'Select a node, lamp, or sensor' })).toBeVisible();
    expect(screen.getByText(/canvas or visible Topology List/i)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows L3 operating state, health, percentages, owner, and neighbors', () => {
    render(<TopologyDetailPanel detail={topologyEntityByLabel(graph, 'L3')} />);
    const panel = screen.getByRole('complementary');

    expect(within(panel).getByRole('heading', { name: 'L3' })).toBeVisible();
    expect(panel).toHaveTextContent('Pre-light');
    expect(panel).toHaveTextContent('Healthy');
    expect(panel).toHaveTextContent('Brightness60%');
    expect(panel).toHaveTextContent('Target brightness60%');
    expect(panel).toHaveTextContent('PWM duty60%');
    expect(panel).toHaveTextContent('NODE_2');
    expect(panel).toHaveTextContent('L2, L4');
    expect(panel).not.toHaveTextContent(/^pwmDuty$/);
  });

  it('shows NODE_1 lamp ownership and communication health as text', () => {
    render(<TopologyDetailPanel detail={topologyEntityByLabel(graph, 'NODE_1')} />);
    const panel = screen.getByRole('complementary');

    expect(panel).toHaveTextContent('NODE_1');
    expect(panel).toHaveTextContent('Communication healthHealthy');
    expect(panel).toHaveTextContent('Owned lampsL1, L2');
    expect(panel).toHaveTextContent('Jun 15, 2026, 8:30 PM UTC');
  });

  it('shows IR3 telemetry metadata without a direction claim', () => {
    render(<TopologyDetailPanel detail={topologyEntityByLabel(graph, 'IR3')} />);
    const panel = screen.getByRole('complementary');

    expect(panel).toHaveTextContent('IR3');
    expect(panel).toHaveTextContent('Data sourceSimulated');
    expect(panel).toHaveTextContent('Metric qualityGood');
    expect(panel).toHaveTextContent('Related segmentL3');
    expect(panel).not.toHaveTextContent(/direction/i);
  });
});
