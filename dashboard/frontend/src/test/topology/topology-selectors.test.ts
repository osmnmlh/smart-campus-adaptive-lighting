import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';
import {
  applyTopologySelection,
  topologyEntityByLabel,
  topologySelection,
} from '@/features/topology/topology-selectors';

const graph = createTopologyGraph(topologySnapshot);
const idFor = (label: string) => {
  const entity = topologyEntityByLabel(graph, label);
  if (!entity) throw new Error(`Missing test entity: ${label}`);
  return entity.id;
};

const focusedLabels = (entityLabel: string) => {
  const selection = topologySelection(graph, idFor(entityLabel));
  return graph.nodes
    .filter((node) => selection.focusedEntityIds.includes(node.id))
    .map((node) => node.label);
};

describe('topology selection selectors', () => {
  it('focuses L2, L3, L4, NODE_2, and IR3 when L3 is selected', () => {
    expect(focusedLabels('L3')).toEqual(['NODE_2', 'L2', 'L3', 'L4', 'IR3']);
  });

  it('dims L1 and L5 while selecting L3', () => {
    const selected = applyTopologySelection(graph, idFor('L3'));

    expect(topologyEntityByLabel(selected, 'L1')?.dimmed).toBe(true);
    expect(topologyEntityByLabel(selected, 'L5')?.dimmed).toBe(true);
    expect(topologyEntityByLabel(selected, 'L3')?.selected).toBe(true);
  });

  it('focuses L1 and L2 at the left boundary', () => {
    const focus = focusedLabels('L1');
    expect(focus).toContain('L1');
    expect(focus).toContain('L2');
    expect(focus).not.toContain('L3');
  });

  it('focuses L4 and L5 at the right boundary', () => {
    const focus = focusedLabels('L5');
    expect(focus).toContain('L4');
    expect(focus).toContain('L5');
    expect(focus).not.toContain('L3');
  });

  it('focuses NODE_1 ownership and related sensors', () => {
    expect(focusedLabels('NODE_1')).toEqual(['NODE_1', 'NODE_2', 'L1', 'L2', 'IR1', 'IR2']);
  });

  it('focuses NODE_2 ownership and both communication neighbors', () => {
    expect(focusedLabels('NODE_2')).toEqual(['NODE_1', 'NODE_2', 'NODE_3', 'L3', 'IR3']);
  });

  it('focuses NODE_3 ownership and related sensors', () => {
    expect(focusedLabels('NODE_3')).toEqual(['NODE_2', 'NODE_3', 'L4', 'L5', 'IR4', 'IR5']);
  });

  it('focuses IR2, its L2 segment, and NODE_1 owner', () => {
    expect(focusedLabels('IR2')).toEqual(['NODE_1', 'L2', 'IR2']);
  });

  it('clear selection restores every node and edge', () => {
    const cleared = applyTopologySelection(applyTopologySelection(graph, idFor('L3')), null);

    expect(cleared.selectedEntityId).toBeNull();
    expect(cleared.nodes.every((node) => !node.selected && !node.dimmed)).toBe(true);
    expect(cleared.edges.every((edge) => !edge.selected && !edge.dimmed)).toBe(true);
  });

  it('unknown entity IDs produce a safe empty selection', () => {
    const selection = topologySelection(graph, 'lamp:unknown');
    const applied = applyTopologySelection(graph, 'lamp:unknown');

    expect(selection.selectedEntityId).toBeNull();
    expect(selection.focusedEntityIds).toEqual([]);
    expect(applied.selectedEntityId).toBeNull();
    expect(applied.nodes.every((node) => !node.dimmed)).toBe(true);
  });
});
