import { render, screen, within } from '@testing-library/react';
import { TopologyDetailPanel } from '@/components/topology/topology-detail-panel';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';
import { topologyEntityByLabel } from '@/features/topology/topology-selectors';

const graph = createTopologyGraph(topologySnapshot);

describe('TopologyDetailPanel', () => {
  it('shows an explanatory no-selection state', () => {
    render(<TopologyDetailPanel detail={null} />);

    expect(
      screen.getByRole('heading', { name: 'Bir node, lamba veya sensör seçin' }),
    ).toBeVisible();
    expect(screen.getByText(/Canvas veya görünür Topology List/i)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows L3 operating state, health, percentages, owner, and neighbors', () => {
    render(<TopologyDetailPanel detail={topologyEntityByLabel(graph, 'L3')} />);
    const panel = screen.getByRole('complementary');

    expect(within(panel).getByRole('heading', { name: 'L3' })).toBeVisible();
    expect(panel).toHaveTextContent('PRE_LIGHT');
    expect(panel).toHaveTextContent('HEALTHY');
    expect(panel).toHaveTextContent('brightnessPercent60%');
    expect(panel).toHaveTextContent('targetBrightnessPercent60%');
    expect(panel).toHaveTextContent('pwmDutyPercent60%');
    expect(panel).toHaveTextContent('NODE_2');
    expect(panel).toHaveTextContent('L2, L4');
    expect(panel).not.toHaveTextContent(/^pwmDuty$/);
  });

  it('shows NODE_1 lamp ownership and communication health as text', () => {
    render(<TopologyDetailPanel detail={topologyEntityByLabel(graph, 'NODE_1')} />);
    const panel = screen.getByRole('complementary');

    expect(panel).toHaveTextContent('NODE_1');
    expect(panel).toHaveTextContent('Communication healthHEALTHY');
    expect(panel).toHaveTextContent('Owned lampsL1, L2');
    expect(panel).toHaveTextContent('2026-06-15 20:30 UTC');
  });

  it('shows IR3 telemetry metadata without a direction claim', () => {
    render(<TopologyDetailPanel detail={topologyEntityByLabel(graph, 'IR3')} />);
    const panel = screen.getByRole('complementary');

    expect(panel).toHaveTextContent('IR3');
    expect(panel).toHaveTextContent('Data sourceSIMULATED');
    expect(panel).toHaveTextContent('Metric qualityGOOD');
    expect(panel).toHaveTextContent('Related segmentL3');
    expect(panel).not.toHaveTextContent(/direction/i);
  });
});
