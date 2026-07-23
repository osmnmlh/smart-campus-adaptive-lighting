import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AlertSchema,
  EventLogSchema,
  type CommunicationNodeId,
  type EventLog,
  type RealtimeDomainEventDraftV1,
  type UtcTimestamp,
} from '@smart-campus/contracts';

import {
  LIVE_READ_MODEL_UPDATE,
  type LiveReadModelUpdatePort,
} from '../../modules/read-model/domain/live-read-model-update.port.js';
import {
  REALTIME_PUBLISHER,
  type RealtimePublisherPort,
} from '../../realtime/domain/realtime-ports.js';

const nodeEntityIds: Readonly<Record<CommunicationNodeId, string>> = {
  NODE_1: 'node-1',
  NODE_2: 'node-2',
  NODE_3: 'node-3',
};

@Injectable()
export class MqttDiagnosticsService {
  private readonly logger = new Logger(MqttDiagnosticsService.name);

  constructor(
    @Inject(LIVE_READ_MODEL_UPDATE) private readonly readModel: LiveReadModelUpdatePort,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisherPort,
  ) {}

  rejected(reason: string): void {
    this.logger.warn(`MQTT message rejected: ${reason}`);
  }

  duplicate(): void {
    this.logger.debug('Duplicate MQTT origin message ignored');
  }

  conflictingDuplicate(nodeId: CommunicationNodeId, observedAt: UtcTimestamp): void {
    this.logger.warn(`Conflicting MQTT duplicate rejected for ${nodeId}`);
    this.appendLog(
      nodeId,
      observedAt,
      'CONFLICTING_DUPLICATE',
      'WARNING',
      'Conflicting origin message rejected',
    );
  }

  nodeRestart(nodeId: CommunicationNodeId, observedAt: UtcTimestamp): void {
    this.appendLog(nodeId, observedAt, 'NODE_RESTART', 'INFO', 'Node boot session changed');
  }

  sequenceGap(nodeId: CommunicationNodeId, gapSize: number, observedAt: UtcTimestamp): void {
    const alertId = `ALERT_MQTT_${nodeId}_SEQUENCE_GAP`;
    const alert = this.readModel.upsertAlert(
      AlertSchema.parse({
        id: alertId,
        code: 'PACKET_LOSS_HIGH',
        status: 'ACTIVE',
        severity: 'WARNING',
        sourceEntity: { entityType: 'NODE', entityId: nodeEntityIds[nodeId] },
        startedAt: observedAt,
        lastObservedAt: observedAt,
        durationMs: 0,
        message: 'A node-origin sequence gap was detected',
        probableCause: 'One or more origin messages were not observed by the backend',
        recommendedAction: 'Inspect node and gateway communication diagnostics',
        metadata: { dataSource: 'MEASURED', gapSize },
      }),
    );
    this.publish({ eventType: 'ALERT_UPSERTED', payload: alert });
    this.appendLog(
      nodeId,
      observedAt,
      'SEQUENCE_GAP',
      'WARNING',
      'Node-origin sequence gap detected',
    );
  }

  communicationRecovered(nodeId: CommunicationNodeId, observedAt: UtcTimestamp): void {
    this.resolveAlert(`ALERT_MQTT_${nodeId}_SEQUENCE_GAP`, observedAt);
    this.appendLog(
      nodeId,
      observedAt,
      'SEQUENCE_RECOVERED',
      'INFO',
      'Node sequence communication recovered',
    );
  }

  nodeOffline(nodeId: CommunicationNodeId, observedAt: UtcTimestamp): void {
    const alert = this.readModel.upsertAlert(
      AlertSchema.parse({
        id: `ALERT_MQTT_${nodeId}_OFFLINE`,
        code: 'NODE_OFFLINE',
        status: 'ACTIVE',
        severity: 'CRITICAL',
        sourceEntity: { entityType: 'NODE', entityId: nodeEntityIds[nodeId] },
        startedAt: observedAt,
        lastObservedAt: observedAt,
        durationMs: 0,
        message: 'Node liveness timeout reached',
        probableCause: 'No accepted node-origin message was observed within the offline timeout',
        recommendedAction: 'Inspect node power and communication path',
        metadata: { dataSource: 'MEASURED' },
      }),
    );
    this.publish({ eventType: 'ALERT_UPSERTED', payload: alert });
    this.appendLog(
      nodeId,
      observedAt,
      'NODE_OFFLINE',
      'ERROR',
      'Node liveness transitioned offline',
    );
  }

  nodeRecovered(nodeId: CommunicationNodeId, observedAt: UtcTimestamp): void {
    this.resolveAlert(`ALERT_MQTT_${nodeId}_OFFLINE`, observedAt);
    this.appendLog(nodeId, observedAt, 'NODE_RECOVERED', 'INFO', 'Node liveness recovered');
  }

  private resolveAlert(alertId: string, observedAt: UtcTimestamp): void {
    const current = this.readModel.findAlert(alertId);
    if (current === null || current.status === 'RESOLVED') return;
    const alert = this.readModel.upsertAlert(
      AlertSchema.parse({
        ...current,
        status: 'RESOLVED',
        lastObservedAt: observedAt,
        resolvedAt: observedAt,
        durationMs: Math.max(0, Date.parse(observedAt) - Date.parse(current.startedAt)),
      }),
    );
    this.publish({ eventType: 'ALERT_UPSERTED', payload: alert });
  }

  private appendLog(
    nodeId: CommunicationNodeId,
    observedAt: UtcTimestamp,
    kind: string,
    level: 'INFO' | 'WARNING' | 'ERROR',
    message: string,
  ): void {
    const severity = level === 'ERROR' ? 'CRITICAL' : level;
    const log: EventLog = this.readModel.appendLog(
      EventLogSchema.parse({
        id: `LOG_MQTT_${nodeId}_${kind}_${observedAt}`,
        timestamp: observedAt,
        source: { entityType: 'NODE', entityId: nodeEntityIds[nodeId] },
        eventType: 'COMMUNICATION_UPDATED',
        severity,
        message,
        metadata: { category: 'COMMUNICATION', level, dataSource: 'MEASURED' },
      }),
    );
    this.publish({ eventType: 'LOG_APPENDED', payload: log });
  }

  private publish(event: RealtimeDomainEventDraftV1): void {
    try {
      this.publisher.publish(event);
    } catch {
      this.logger.warn('Realtime diagnostic publication failed');
    }
  }
}
