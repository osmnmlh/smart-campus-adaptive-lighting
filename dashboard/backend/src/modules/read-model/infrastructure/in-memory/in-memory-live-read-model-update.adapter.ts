import { Injectable } from '@nestjs/common';
import {
  AlertSchema,
  EventLogSchema,
  LampSnapshotSchema,
  MetricQuality,
  NodeSnapshotSchema,
  SensorSnapshotSchema,
  type CommunicationLampId,
  type CommunicationNodeId,
  type IrSensorId,
  type LampId,
  type NodeId,
  type RealtimeDomainEventDraftV1,
  type SensorId,
} from '@smart-campus/contracts';

import type {
  AcceptedNodeMessageUpdate,
  LiveReadModelMutation,
  LiveReadModelUpdatePort,
} from '../../domain/live-read-model-update.port.js';
import {
  InMemoryAlertReadRepository,
  InMemoryLogReadRepository,
  InMemorySnapshotReadRepository,
} from './in-memory-read-repositories.js';

const nodeIds: Readonly<Record<CommunicationNodeId, NodeId>> = {
  NODE_1: 'node-1',
  NODE_2: 'node-2',
  NODE_3: 'node-3',
};
const lampIds: Readonly<Record<CommunicationLampId, LampId>> = {
  L1: 'lamp-1',
  L2: 'lamp-2',
  L3: 'lamp-3',
  L4: 'lamp-4',
  L5: 'lamp-5',
};
const sensorIds: Readonly<Record<IrSensorId, SensorId>> = {
  IR1: 'sensor-ir-1',
  IR2: 'sensor-ir-2',
  IR3: 'sensor-ir-3',
  IR4: 'sensor-ir-4',
  IR5: 'sensor-ir-5',
};

@Injectable()
export class InMemoryLiveReadModelUpdateAdapter implements LiveReadModelUpdatePort {
  constructor(
    private readonly snapshots: InMemorySnapshotReadRepository,
    private readonly alerts: InMemoryAlertReadRepository,
    private readonly logs: InMemoryLogReadRepository,
  ) {}

  applyNodeMessage(update: AcceptedNodeMessageUpdate): LiveReadModelMutation {
    const snapshot = this.snapshots.getCurrentSnapshot();
    const nodeId = nodeIds[update.message.nodeId];
    const currentNode = snapshot.nodes.find((node) => node.nodeId === nodeId);
    if (currentNode === undefined) throw new Error('Canonical node is missing from read model');

    const packetsReceived = currentNode.communication.packetsReceived + 1;
    const packetsLost = update.sequenceGapCount;
    const node = NodeSnapshotSchema.parse({
      ...currentNode,
      online: true,
      uptimeMs: update.message.uptimeMs,
      ...(update.message.messageType === 'HEARTBEAT'
        ? { firmwareVersion: update.message.payload.firmwareVersion }
        : {}),
      ...(update.message.messageType === 'SENSOR_EVENT'
        ? { lastSensorTriggeredId: sensorIds[update.message.payload.sensorId] }
        : {}),
      communication: {
        ...currentNode.communication,
        health: update.communicationHealth,
        lastHeartbeatAt: update.acceptedAt,
        packetsReceived,
        packetsLost,
        packetLossPercent:
          packetsReceived + packetsLost === 0
            ? 0
            : (packetsLost / (packetsReceived + packetsLost)) * 100,
        lastSequenceNumber: update.message.sequence,
        lastMessageReceived: update.message.messageType,
      },
    });
    const storedNode = this.snapshots.setNode(node, update.acceptedAt);

    let primaryEvent: RealtimeDomainEventDraftV1;
    switch (update.message.messageType) {
      case 'HEARTBEAT':
        primaryEvent = { eventType: 'NODE_UPDATED', payload: storedNode };
        break;
      case 'SENSOR_EVENT': {
        const sensorId = sensorIds[update.message.payload.sensorId];
        const currentSensor = snapshot.sensors.find((sensor) => sensor.sensorId === sensorId);
        if (currentSensor === undefined)
          throw new Error('Canonical sensor is missing from read model');
        const sensor = this.snapshots.setSensor(
          SensorSnapshotSchema.parse({
            ...currentSensor,
            health: 'HEALTHY',
            active: update.message.payload.state === 'ACTIVE',
            lastChangedAt: update.acceptedAt,
          }),
          update.acceptedAt,
        );
        primaryEvent = { eventType: 'SENSOR_UPDATED', payload: sensor };
        break;
      }
      case 'LAMP_STATE': {
        const lampId = lampIds[update.message.payload.lampId];
        const currentLamp = snapshot.lamps.find((lamp) => lamp.lampId === lampId);
        if (currentLamp === undefined) throw new Error('Canonical lamp is missing from read model');
        const lamp = this.snapshots.setLamp(
          LampSnapshotSchema.parse({
            ...currentLamp,
            operatingState: update.message.payload.operatingState,
            health: update.message.payload.health,
            brightnessPercent: update.message.payload.brightnessPercent,
            targetBrightnessPercent: update.message.payload.targetBrightnessPercent,
            pwmDutyPercent: update.message.payload.pwmDutyPercent,
            updatedAt: update.acceptedAt,
          }),
          update.acceptedAt,
        );
        primaryEvent = { eventType: 'LAMP_UPDATED', payload: lamp };
        break;
      }
      case 'ELECTRICAL_MEASUREMENT': {
        const lampId = lampIds[update.message.payload.scopeId];
        const currentLamp = snapshot.lamps.find((lamp) => lamp.lampId === lampId);
        if (currentLamp === undefined) throw new Error('Canonical lamp is missing from read model');
        const metricBase = {
          source: update.message.payload.dataSource,
          observedAt: update.acceptedAt,
          quality: MetricQuality.GOOD,
        } as const;
        const lamp = this.snapshots.setLamp(
          LampSnapshotSchema.parse({
            ...currentLamp,
            electrical: {
              voltage: { ...metricBase, value: update.message.payload.voltageV, unit: 'V' },
              current: { ...metricBase, value: update.message.payload.currentA, unit: 'A' },
              power: { ...metricBase, value: update.message.payload.powerW, unit: 'W' },
              energy: { ...metricBase, value: update.message.payload.energyWh, unit: 'Wh' },
            },
            updatedAt: update.acceptedAt,
          }),
          update.acceptedAt,
        );
        primaryEvent = { eventType: 'LAMP_UPDATED', payload: lamp };
        break;
      }
    }

    return { node: storedNode, primaryEvent };
  }

  markNodeOffline(
    nodeId: CommunicationNodeId,
    observedAt: AcceptedNodeMessageUpdate['acceptedAt'],
  ) {
    const snapshot = this.snapshots.getCurrentSnapshot();
    const currentNode = snapshot.nodes.find((node) => node.nodeId === nodeIds[nodeId]);
    if (currentNode === undefined) throw new Error('Canonical node is missing from read model');
    return this.snapshots.setNode(
      NodeSnapshotSchema.parse({
        ...currentNode,
        online: false,
        communication: { ...currentNode.communication, health: 'LOST' },
      }),
      observedAt,
    );
  }

  upsertAlert(alert: Parameters<LiveReadModelUpdatePort['upsertAlert']>[0]) {
    return this.alerts.upsert(AlertSchema.parse(alert));
  }

  findAlert(alertId: string) {
    return this.alerts.findById(alertId);
  }

  appendLog(log: Parameters<LiveReadModelUpdatePort['appendLog']>[0]) {
    return this.logs.append(EventLogSchema.parse(log));
  }
}
