import { fireEvent, render, screen, within } from '@testing-library/react';
import { TopologyDashboard } from '@/components/topology/topology-dashboard';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';

const graph = createTopologyGraph(topologySnapshot);

const relationships = () => screen.getByText('Relationship details').closest('details')!;
const openRelationships = () => {
  const details = relationships();
  if (!details.open)
    fireEvent.click(within(details).getByText('Relationship details').closest('summary')!);
  return details;
};

describe('Topology relationship disclosure', () => {
  it('keeps the accessible entity list visible by default', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    const list = screen.getByRole('heading', { name: 'Topology List' }).closest('section')!;
    expect(within(list).getAllByRole('button')).toHaveLength(14);
  });

  it('starts relationship details closed', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(relationships()).not.toHaveAttribute('open');
    expect(screen.getByText('Relationships')).not.toBeVisible();
  });

  it('shows the requested summary title and description', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(within(relationships()).getByText('Relationship details')).toBeVisible();
    expect(
      within(relationships()).getByText(/communication, ownership, and sensing/i),
    ).toBeVisible();
  });

  it('shows the complete relationship list after opening', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    const details = openRelationships();
    expect(within(details).getByRole('heading', { name: 'Relationships' })).toBeVisible();
    expect(within(details).getAllByRole('listitem')).toHaveLength(graph.edges.length + 1);
  });

  it('preserves communication relationships', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(within(openRelationships()).getAllByText(/communication/i).length).toBeGreaterThan(0);
  });

  it('preserves ownership relationships', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(within(openRelationships()).getAllByText(/ownership/i).length).toBeGreaterThan(0);
  });

  it('preserves sensing relationships', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(within(openRelationships()).getAllByText(/sensing/i).length).toBeGreaterThan(0);
  });

  it('preserves deterministic edge source and target text', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(
      within(openRelationships()).getByText(/controller:node-1.*controller:node-2/),
    ).toBeVisible();
  });

  it('preserves the ambient sensor relationship alternative', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(within(openRelationships()).getByText(/System ambient sensor/)).toBeVisible();
  });

  it('keeps canvas controls and shared selection working while relationships are closed', () => {
    render(<TopologyDashboard initialGraph={graph} />);
    expect(screen.getByLabelText('Interactive system topology canvas')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fit View' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset View' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /L3/ }));
    expect(screen.getByRole('complementary')).toHaveTextContent('L2, L4');
    expect(relationships()).not.toHaveAttribute('open');
  });
});
