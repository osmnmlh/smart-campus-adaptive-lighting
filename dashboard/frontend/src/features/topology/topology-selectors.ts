import type {
  LampTopologyNode,
  TopologyDetailModel,
  TopologyGraphModel,
  TopologyNodeModel,
  TopologySelection,
} from './topology-model';

export function topologyEntity(
  graph: TopologyGraphModel,
  entityId: string,
): TopologyNodeModel | null {
  return graph.nodes.find((node) => node.id === entityId) ?? null;
}

export function topologyEntityByLabel(
  graph: TopologyGraphModel,
  label: string,
): TopologyNodeModel | null {
  return graph.nodes.find((node) => node.label === label) ?? null;
}

function ownerForLamp(graph: TopologyGraphModel, lampEntityId: string): string | null {
  const lamp = topologyEntity(graph, lampEntityId);
  return lamp?.entityType === 'lamp' ? lamp.ownerNodeId : null;
}

function lampFocusIds(graph: TopologyGraphModel, lamp: LampTopologyNode): Set<string> {
  const focus = new Set<string>([lamp.id, lamp.ownerNodeId, ...lamp.neighborLampIds]);
  graph.nodes
    .filter((node) => node.entityType === 'sensor' && node.relatedLampId === lamp.id)
    .forEach((node) => focus.add(node.id));
  return focus;
}

export function topologySelection(
  graph: TopologyGraphModel,
  selectedEntityId: string | null,
): TopologySelection {
  if (!selectedEntityId) {
    return { selectedEntityId: null, focusedEntityIds: graph.nodes.map((node) => node.id) };
  }

  const selected = topologyEntity(graph, selectedEntityId);
  if (!selected) return { selectedEntityId: null, focusedEntityIds: [] };

  let focus = new Set<string>([selected.id]);

  if (selected.entityType === 'lamp') {
    focus = lampFocusIds(graph, selected);
  }

  if (selected.entityType === 'controller') {
    selected.relatedEntityIds.forEach((id) => focus.add(id));
    graph.nodes
      .filter(
        (node) =>
          node.entityType === 'sensor' &&
          node.relatedLampId !== null &&
          selected.ownedLampIds.includes(node.relatedLampId),
      )
      .forEach((node) => focus.add(node.id));
  }

  if (selected.entityType === 'sensor' && selected.relatedLampId) {
    focus.add(selected.relatedLampId);
    const owner = ownerForLamp(graph, selected.relatedLampId);
    if (owner) focus.add(owner);
  }

  return {
    selectedEntityId: selected.id,
    focusedEntityIds: graph.nodes.filter((node) => focus.has(node.id)).map((node) => node.id),
  };
}

export function applyTopologySelection(
  graph: TopologyGraphModel,
  selectedEntityId: string | null,
): TopologyGraphModel {
  const selection = topologySelection(graph, selectedEntityId);
  const hasSelection = selection.selectedEntityId !== null;
  const focused = new Set(selection.focusedEntityIds);

  return {
    ...graph,
    selectedEntityId: selection.selectedEntityId,
    nodes: graph.nodes.map((node) => ({
      ...node,
      selected: node.id === selection.selectedEntityId,
      dimmed: hasSelection && !focused.has(node.id),
      position: { ...node.position },
      relatedEntityIds: [...node.relatedEntityIds],
    })) as readonly TopologyNodeModel[],
    edges: graph.edges.map((edge) => ({
      ...edge,
      selected: hasSelection && focused.has(edge.source) && focused.has(edge.target),
      dimmed: hasSelection && (!focused.has(edge.source) || !focused.has(edge.target)),
    })),
  };
}

export function topologyDetail(
  graph: TopologyGraphModel,
  selectedEntityId: string | null,
): TopologyDetailModel {
  if (!selectedEntityId) return null;
  return topologyEntity(graph, selectedEntityId);
}
