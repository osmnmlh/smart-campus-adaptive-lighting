import type {
  CommunicationHealth,
  DataSource,
  LampHealth,
  LampOperatingState,
  MetricQuality,
  NodeHealth,
  SensorHealth,
  SensorType,
} from '@smart-campus/contracts';
import type { Edge, Node, XYPosition } from '@xyflow/react';

export type TopologyEntityType = 'controller' | 'lamp' | 'sensor';
export type TopologyEdgeCategory = 'communication' | 'ownership' | 'sensing';
export type TopologyStatusTone =
  'healthy' | 'warning' | 'fault' | 'active' | 'pre-light' | 'standby' | 'neutral';

type TopologyNodeBase = Readonly<{
  id: string;
  entityType: TopologyEntityType;
  label: string;
  sourceEntityId: string;
  statusText: string;
  statusTone: TopologyStatusTone;
  position: XYPosition;
  relatedEntityIds: readonly string[];
  selected: boolean;
  dimmed: boolean;
}>;

export type ControllerTopologyNode = TopologyNodeBase &
  Readonly<{
    entityType: 'controller';
    health: NodeHealth;
    communicationHealth: CommunicationHealth;
    ownedLampIds: readonly string[];
    updatedAt: string;
    updatedAtLabel: string;
  }>;

export type LampTopologyNode = TopologyNodeBase &
  Readonly<{
    entityType: 'lamp';
    health: LampHealth;
    operatingState: LampOperatingState;
    brightnessPercent: number;
    targetBrightnessPercent: number;
    pwmDutyPercent: number;
    ownerNodeId: string;
    neighborLampIds: readonly string[];
  }>;

export type SensorTopologyNode = TopologyNodeBase &
  Readonly<{
    entityType: 'sensor';
    health: SensorHealth;
    sensorType: SensorType;
    active: boolean | null;
    activityText: string;
    dataSource: DataSource;
    metricQuality: MetricQuality;
    relatedLampId: string | null;
    systemAmbient: boolean;
  }>;

export type TopologyNodeModel = ControllerTopologyNode | LampTopologyNode | SensorTopologyNode;

export type TopologyEdgeModel = Readonly<{
  id: string;
  category: TopologyEdgeCategory;
  source: string;
  target: string;
  label: string;
  bidirectional: boolean;
  selected: boolean;
  dimmed: boolean;
}>;

export type TopologyGraphModel = Readonly<{
  snapshotAt: string;
  snapshotAtLabel: string;
  dataSource: DataSource;
  nodes: readonly TopologyNodeModel[];
  edges: readonly TopologyEdgeModel[];
  selectedEntityId: string | null;
}>;

export type TopologySelection = Readonly<{
  selectedEntityId: string | null;
  focusedEntityIds: readonly string[];
}>;

export type TopologyDetailModel = TopologyNodeModel | null;

export type TopologyFlowNodeData = {
  [key: string]: unknown;
  entity: TopologyNodeModel;
  onSelect: (entityId: string) => void;
};

export type TopologyFlowNode = Node<TopologyFlowNodeData, TopologyEntityType>;

export type TopologyFlowEdgeData = {
  [key: string]: unknown;
  category: TopologyEdgeCategory;
};

export type TopologyFlowEdge = Edge<TopologyFlowEdgeData, 'smoothstep'>;
