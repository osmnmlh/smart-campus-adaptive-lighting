import { DataSource, MetricQuality, SystemSnapshotSchema } from '@smart-campus/contracts';
import {
  createTopologyGraph,
  createValidatedTopologyGraph,
} from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';

const graph = createTopologyGraph(topologySnapshot);

describe('topology adapter', () => {
  it('creates exactly three controller, five lamp, and six sensor nodes', () => {
    expect(graph.nodes.filter((node) => node.entityType === 'controller')).toHaveLength(3);
    expect(graph.nodes.filter((node) => node.entityType === 'lamp')).toHaveLength(5);
    expect(graph.nodes.filter((node) => node.entityType === 'sensor')).toHaveLength(6);
    expect(graph.nodes).toHaveLength(14);
  });

  it('creates the canonical ownership edges', () => {
    const ownership = graph.edges.filter((edge) => edge.category === 'ownership');

    expect(ownership).toHaveLength(5);
    expect(ownership.map((edge) => `${edge.source}->${edge.target}`)).toEqual([
      'controller:node-1->lamp:lamp-1',
      'controller:node-1->lamp:lamp-2',
      'controller:node-2->lamp:lamp-3',
      'controller:node-3->lamp:lamp-4',
      'controller:node-3->lamp:lamp-5',
    ]);
  });

  it('creates only the two canonical bidirectional communication edges', () => {
    const communication = graph.edges.filter((edge) => edge.category === 'communication');

    expect(communication).toHaveLength(2);
    expect(communication.every((edge) => edge.bidirectional)).toBe(true);
    expect(communication.map((edge) => [edge.source, edge.target])).toEqual([
      ['controller:node-1', 'controller:node-2'],
      ['controller:node-2', 'controller:node-3'],
    ]);
    expect(
      communication.some(
        (edge) => edge.source === 'controller:node-1' && edge.target === 'controller:node-3',
      ),
    ).toBe(false);
  });

  it('creates five deterministic sensor-to-segment relationships', () => {
    const sensing = graph.edges.filter((edge) => edge.category === 'sensing');

    expect(sensing).toHaveLength(5);
    expect(sensing.map((edge) => `${edge.source}->${edge.target}`)).toEqual([
      'sensor:sensor-ir-1->lamp:lamp-1',
      'sensor:sensor-ir-2->lamp:lamp-2',
      'sensor:sensor-ir-3->lamp:lamp-3',
      'sensor:sensor-ir-4->lamp:lamp-4',
      'sensor:sensor-ir-5->lamp:lamp-5',
    ]);
  });

  it('keeps BH1750 as a system ambient sensor without invented ownership', () => {
    const ambient = graph.nodes.find((node) => node.id === 'sensor:sensor-bh1750-1');

    expect(ambient?.entityType).toBe('sensor');
    expect(ambient?.relatedEntityIds).toEqual([]);
    expect(graph.edges.some((edge) => edge.source === 'sensor:sensor-bh1750-1')).toBe(false);
  });

  it('uses deterministic unique edge IDs and node positions', () => {
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(graph.edges.length);
    expect(graph.nodes.find((node) => node.label === 'L3')?.position).toEqual({ x: 520, y: 350 });
    expect(graph.nodes.find((node) => node.label === 'NODE_2')?.position).toEqual({
      x: 520,
      y: 570,
    });
  });

  it('preserves canonical lamp health, operating state, and percentage fields', () => {
    const lamp = graph.nodes.find((node) => node.label === 'L3');
    expect(lamp?.entityType).toBe('lamp');
    if (lamp?.entityType !== 'lamp') throw new Error('L3 missing');

    expect(lamp.operatingState).toBe('PRE_LIGHT');
    expect(lamp.health).toBe('HEALTHY');
    expect(lamp.brightnessPercent).toBe(60);
    expect(lamp.targetBrightnessPercent).toBe(60);
    expect(lamp.pwmDutyPercent).toBe(60);
  });

  it('marks all sensor metrics as simulated and good quality', () => {
    const sensors = graph.nodes.filter((node) => node.entityType === 'sensor');

    expect(sensors.every((sensor) => sensor.dataSource === DataSource.SIMULATED)).toBe(true);
    expect(sensors.every((sensor) => sensor.metricQuality === MetricQuality.GOOD)).toBe(true);
  });

  it('does not mutate the input snapshot', () => {
    const before = structuredClone(topologySnapshot);

    createTopologyGraph(topologySnapshot);

    expect(topologySnapshot).toEqual(before);
    expect(JSON.stringify(topologySnapshot)).toBe(JSON.stringify(before));
  });

  it('produces the same JSON graph for the same snapshot', () => {
    const first = createTopologyGraph(topologySnapshot);
    const second = createTopologyGraph(topologySnapshot);

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(first)).not.toContain('undefined');
  });

  it('reuses a fixture accepted by the shared snapshot schema', () => {
    expect(SystemSnapshotSchema.parse(topologySnapshot)).toEqual(topologySnapshot);
    expect(createValidatedTopologyGraph(topologySnapshot)).toEqual(graph);
  });

  it('rejects an invalid fixture before graph creation', () => {
    expect(() => createValidatedTopologyGraph({ snapshotAt: 'invalid' })).toThrow();
  });
});
