import {
  DataSource,
  MetricQuality,
  SensorType,
  SystemSnapshotSchema,
  type SystemSnapshot,
} from '@smart-campus/contracts';
import { topologyPosition } from './topology-layout';
import type {
  ControllerTopologyNode,
  LampTopologyNode,
  SensorTopologyNode,
  TopologyEdgeModel,
  TopologyGraphModel,
  TopologyStatusTone,
} from './topology-model';
import {
  communicationHealthLabel,
  displayEntityId,
  formatUtcTimestamp,
  lampHealthLabel,
  lampOperatingStateLabel,
  nodeHealthLabel,
  sensorHealthLabel,
  sensorTypeFor,
  sensorTypeLabel,
} from '@/features/overview/overview-selectors';

const nodeLampOwnership: Readonly<Record<string, readonly string[]>> = {
  'node-1': ['lamp-1', 'lamp-2'],
  'node-2': ['lamp-3'],
  'node-3': ['lamp-4', 'lamp-5'],
};

const lampOwners: Readonly<Record<string, string>> = {
  'lamp-1': 'node-1',
  'lamp-2': 'node-1',
  'lamp-3': 'node-2',
  'lamp-4': 'node-3',
  'lamp-5': 'node-3',
};

const sensorLampRelations: Readonly<Record<string, string>> = {
  'sensor-ir-1': 'lamp-1',
  'sensor-ir-2': 'lamp-2',
  'sensor-ir-3': 'lamp-3',
  'sensor-ir-4': 'lamp-4',
  'sensor-ir-5': 'lamp-5',
};

const communicationNeighbors: Readonly<Record<string, readonly string[]>> = {
  'node-1': ['node-2'],
  'node-2': ['node-1', 'node-3'],
  'node-3': ['node-2'],
};

const controllerId = (sourceId: string) => `controller:${sourceId}`;
const lampId = (sourceId: string) => `lamp:${sourceId}`;
const sensorId = (sourceId: string) => `sensor:${sourceId}`;

function statusTone(value: string): TopologyStatusTone {
  if (value === 'ACTIVE') return 'active';
  if (value === 'PRE_LIGHT') return 'pre-light';
  if (value === 'STANDBY') return 'standby';
  if (value === 'HEALTHY') return 'healthy';
  if (value === 'WARNING' || value === 'DEGRADED') return 'warning';
  if (value === 'FAULT' || value === 'CRITICAL' || value === 'OFFLINE' || value === 'LOST') {
    return 'fault';
  }
  return 'neutral';
}

function neighborLampSourceIds(sourceId: string): readonly string[] {
  const lampNumber = Number(sourceId.replace('lamp-', ''));
  return [lampNumber - 1, lampNumber + 1]
    .filter((value) => value >= 1 && value <= 5)
    .map((value) => `lamp-${value}`);
}

function controllerNodes(snapshot: SystemSnapshot): readonly ControllerTopologyNode[] {
  return [...snapshot.nodes]
    .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
    .map((node) => {
      const ownedLampIds = (nodeLampOwnership[node.nodeId] ?? []).map(lampId);
      const relatedEntityIds = [
        ...ownedLampIds,
        ...(communicationNeighbors[node.nodeId] ?? []).map(controllerId),
      ];
      const id = controllerId(node.nodeId);
      const updatedAt = node.communication.lastHeartbeatAt ?? snapshot.snapshotAt;

      return {
        id,
        entityType: 'controller',
        label: displayEntityId(node.nodeId),
        sourceEntityId: node.nodeId,
        health: node.health,
        communicationHealth: node.communication.health,
        ownedLampIds,
        updatedAt,
        updatedAtLabel: formatUtcTimestamp(updatedAt),
        statusText: `${nodeHealthLabel(node.health)} · Communication ${communicationHealthLabel(node.communication.health)}`,
        statusTone: statusTone(node.health),
        position: topologyPosition(id),
        relatedEntityIds,
        selected: false,
        dimmed: false,
      };
    });
}

function lampNodes(snapshot: SystemSnapshot): readonly LampTopologyNode[] {
  return [...snapshot.lamps]
    .sort((left, right) => left.lampId.localeCompare(right.lampId))
    .map((lamp) => {
      const ownerSourceId = lampOwners[lamp.lampId];
      if (!ownerSourceId) throw new Error(`Missing owner for topology lamp: ${lamp.lampId}`);
      const ownerNodeId = controllerId(ownerSourceId);
      const neighborLampIds = neighborLampSourceIds(lamp.lampId).map(lampId);
      const relatedSensorIds = Object.entries(sensorLampRelations)
        .filter(([, relatedLampId]) => relatedLampId === lamp.lampId)
        .map(([relatedSensorId]) => sensorId(relatedSensorId));
      const id = lampId(lamp.lampId);

      return {
        id,
        entityType: 'lamp',
        label: displayEntityId(lamp.lampId),
        sourceEntityId: lamp.lampId,
        health: lamp.health,
        operatingState: lamp.operatingState,
        brightnessPercent: lamp.brightnessPercent,
        targetBrightnessPercent: lamp.targetBrightnessPercent,
        pwmDutyPercent: lamp.pwmDutyPercent,
        ownerNodeId,
        neighborLampIds,
        statusText: `${lampOperatingStateLabel(lamp.operatingState)} · ${lampHealthLabel(lamp.health)} · ${lamp.brightnessPercent}%`,
        statusTone: statusTone(lamp.operatingState),
        position: topologyPosition(id),
        relatedEntityIds: [ownerNodeId, ...neighborLampIds, ...relatedSensorIds],
        selected: false,
        dimmed: false,
      };
    });
}

function sensorNodes(snapshot: SystemSnapshot): readonly SensorTopologyNode[] {
  return [...snapshot.sensors]
    .sort((left, right) => left.sensorId.localeCompare(right.sensorId))
    .map((sensor) => {
      const type = sensorTypeFor(sensor.sensorId);
      const relatedLampSourceId = sensorLampRelations[sensor.sensorId] ?? null;
      const relatedLampId = relatedLampSourceId ? lampId(relatedLampSourceId) : null;
      const active = sensor.active ?? null;
      const activityText = active === null ? 'System ambient' : active ? 'Active' : 'Inactive';
      const dataSource = sensor.reading?.source ?? DataSource.SIMULATED;
      const metricQuality = sensor.reading?.quality ?? MetricQuality.GOOD;
      const id = sensorId(sensor.sensorId);

      return {
        id,
        entityType: 'sensor',
        label: displayEntityId(sensor.sensorId),
        sourceEntityId: sensor.sensorId,
        health: sensor.health,
        sensorType: type,
        active,
        activityText,
        dataSource,
        metricQuality,
        relatedLampId,
        systemAmbient: type === SensorType.BH1750,
        statusText: `${sensorTypeLabel(type)} · ${activityText} · ${sensorHealthLabel(sensor.health)}`,
        statusTone: active === true ? 'active' : statusTone(sensor.health),
        position: topologyPosition(id),
        relatedEntityIds: relatedLampId ? [relatedLampId] : [],
        selected: false,
        dimmed: false,
      };
    });
}

function topologyEdges(): readonly TopologyEdgeModel[] {
  const communication: readonly TopologyEdgeModel[] = [
    {
      id: 'communication:node-1:node-2',
      category: 'communication',
      source: controllerId('node-1'),
      target: controllerId('node-2'),
      label: 'Bidirectional communication',
      bidirectional: true,
      selected: false,
      dimmed: false,
    },
    {
      id: 'communication:node-2:node-3',
      category: 'communication',
      source: controllerId('node-2'),
      target: controllerId('node-3'),
      label: 'Bidirectional communication',
      bidirectional: true,
      selected: false,
      dimmed: false,
    },
  ];

  const ownership = Object.entries(nodeLampOwnership).flatMap(([nodeSourceId, lampSourceIds]) =>
    lampSourceIds.map<TopologyEdgeModel>((lampSourceId) => ({
      id: `ownership:${nodeSourceId}:${lampSourceId}`,
      category: 'ownership',
      source: controllerId(nodeSourceId),
      target: lampId(lampSourceId),
      label: 'Controls',
      bidirectional: false,
      selected: false,
      dimmed: false,
    })),
  );

  const sensing = Object.entries(sensorLampRelations).map<TopologyEdgeModel>(
    ([sensorSourceId, lampSourceId]) => ({
      id: `sensing:${sensorSourceId}:${lampSourceId}`,
      category: 'sensing',
      source: sensorId(sensorSourceId),
      target: lampId(lampSourceId),
      label: 'Senses segment',
      bidirectional: false,
      selected: false,
      dimmed: false,
    }),
  );

  return [...communication, ...ownership, ...sensing];
}

export function createTopologyGraph(snapshot: SystemSnapshot): TopologyGraphModel {
  return {
    snapshotAt: snapshot.snapshotAt,
    snapshotAtLabel: formatUtcTimestamp(snapshot.snapshotAt),
    dataSource: snapshot.lux?.source ?? DataSource.SIMULATED,
    nodes: [...controllerNodes(snapshot), ...lampNodes(snapshot), ...sensorNodes(snapshot)],
    edges: topologyEdges(),
    selectedEntityId: null,
  };
}

export function createValidatedTopologyGraph(input: unknown): TopologyGraphModel {
  return createTopologyGraph(SystemSnapshotSchema.parse(input));
}
