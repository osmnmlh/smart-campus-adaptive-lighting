import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GatewayMqttEnvelopeV1Schema,
  GatewayStatusMessageV1Schema,
  mapMessageTypeToTopicKind,
  parseGatewayStatusTopic,
  parseNodeMqttTopic,
} from '@smart-campus/contracts';

import type { EnvironmentConfig } from '../../common/config/environment.js';
import {
  LIVE_READ_MODEL_UPDATE,
  type LiveReadModelUpdatePort,
} from '../../modules/read-model/domain/live-read-model-update.port.js';
import {
  REALTIME_CLOCK,
  REALTIME_PUBLISHER,
  type RealtimeClock,
  type RealtimePublisherPort,
} from '../../realtime/domain/realtime-ports.js';
import { MQTT_CONFIG, type MqttInboundMessage } from '../domain/mqtt-ports.js';
import { GatewaySequenceTracker } from './gateway-sequence-tracker.js';
import { MqttDiagnosticsService } from './mqtt-diagnostics.service.js';
import { MqttRuntimeStateService } from './mqtt-runtime-state.service.js';
import { NodeSequenceTracker } from './node-sequence-tracker.js';
import { OriginMessageDeduplicationStore } from './origin-message-deduplication.store.js';

export type MqttIngestionOutcome = 'ACCEPTED' | 'DUPLICATE' | 'CONFLICT' | 'REJECTED' | 'DISABLED';

type ParsedTopic =
  | {
      kind: 'NODE';
      nodeId: ReturnType<typeof parseNodeMqttTopic>['nodeId'];
      topicKind: ReturnType<typeof parseNodeMqttTopic>['kind'];
    }
  | { kind: 'GATEWAY'; gatewayId: ReturnType<typeof parseGatewayStatusTopic>['gatewayId'] };

@Injectable()
export class MqttIngestionService {
  private readonly logger = new Logger(MqttIngestionService.name);

  constructor(
    @Inject(MQTT_CONFIG) private readonly config: EnvironmentConfig,
    @Inject(REALTIME_CLOCK) private readonly clock: RealtimeClock,
    private readonly deduplication: OriginMessageDeduplicationStore,
    private readonly nodeSequences: NodeSequenceTracker,
    private readonly gatewaySequences: GatewaySequenceTracker,
    @Inject(LIVE_READ_MODEL_UPDATE) private readonly readModel: LiveReadModelUpdatePort,
    @Inject(REALTIME_PUBLISHER) private readonly publisher: RealtimePublisherPort,
    private readonly runtimeState: MqttRuntimeStateService,
    private readonly diagnostics: MqttDiagnosticsService,
  ) {}

  ingest(rawMessage: MqttInboundMessage): MqttIngestionOutcome {
    if (!this.config.mqttEnabled) return 'DISABLED';
    if (rawMessage.payload.byteLength > this.config.mqttMaxPayloadBytes) {
      this.diagnostics.rejected('PAYLOAD_TOO_LARGE');
      return 'REJECTED';
    }

    const topic = this.parseTopic(rawMessage.topic);
    if (topic === null) {
      this.diagnostics.rejected('INVALID_TOPIC');
      return 'REJECTED';
    }

    const decoded = this.decodePayload(rawMessage.payload);
    if (decoded === null) {
      this.diagnostics.rejected('INVALID_JSON');
      return 'REJECTED';
    }

    try {
      return topic.kind === 'GATEWAY'
        ? this.ingestGatewayStatus(topic.gatewayId, decoded, rawMessage)
        : this.ingestNodeEnvelope(topic.nodeId, topic.topicKind, decoded, rawMessage);
    } catch {
      this.diagnostics.rejected('INVALID_SCHEMA_OR_STATE');
      return 'REJECTED';
    }
  }

  private ingestGatewayStatus(
    topicGatewayId: 'GW_1',
    decoded: Record<string, unknown>,
    rawMessage: MqttInboundMessage,
  ): MqttIngestionOutcome {
    const status = GatewayStatusMessageV1Schema.parse(decoded);
    if (status.gatewayId !== topicGatewayId || rawMessage.qos !== 1 || !rawMessage.retain) {
      this.diagnostics.rejected('GATEWAY_TOPIC_OR_PACKET_POLICY_MISMATCH');
      return 'REJECTED';
    }
    this.logger.log(`Gateway ${status.gatewayId} reported ${status.status}`);
    this.runtimeState.setGatewayStatus(status.status);
    return 'ACCEPTED';
  }

  private ingestNodeEnvelope(
    topicNodeId: ReturnType<typeof parseNodeMqttTopic>['nodeId'],
    topicKind: ReturnType<typeof parseNodeMqttTopic>['kind'],
    decoded: Record<string, unknown>,
    rawMessage: MqttInboundMessage,
  ): MqttIngestionOutcome {
    const envelope = GatewayMqttEnvelopeV1Schema.parse(decoded);
    if (
      envelope.nodeMessage.nodeId !== topicNodeId ||
      mapMessageTypeToTopicKind(envelope.nodeMessage.messageType) !== topicKind ||
      rawMessage.qos !== 1 ||
      rawMessage.retain
    ) {
      this.diagnostics.rejected('NODE_TOPIC_OR_PACKET_POLICY_MISMATCH');
      return 'REJECTED';
    }

    const inspection = this.deduplication.inspect(envelope.messageId, envelope.nodeMessage);
    if (inspection.kind === 'DUPLICATE') {
      this.diagnostics.duplicate();
      return 'DUPLICATE';
    }
    if (inspection.kind === 'CONFLICT') {
      this.diagnostics.conflictingDuplicate(envelope.nodeMessage.nodeId, this.clock.now());
      return 'CONFLICT';
    }

    const acceptedAt = this.clock.now();
    const decision = this.nodeSequences.evaluate(envelope.nodeMessage, acceptedAt);
    if (!decision.accepted) {
      this.diagnostics.rejected(decision.kind);
      return 'REJECTED';
    }

    const mutation = this.readModel.applyNodeMessage({
      message: envelope.nodeMessage,
      acceptedAt,
      communicationHealth: decision.nextState.communicationHealth,
      sequenceGapCount: decision.nextState.sequenceGapCount,
    });
    this.nodeSequences.commit(decision);
    this.deduplication.remember(envelope.messageId, inspection.fingerprint);
    this.runtimeState.setNodeOnline(envelope.nodeMessage.nodeId, true);

    this.publish(mutation.primaryEvent);
    if (
      mutation.primaryEvent.eventType !== 'NODE_UPDATED' &&
      (decision.kind === 'GAP' ||
        decision.kind === 'RESTART' ||
        decision.kind === 'RESTART_SEQUENCE_UNEXPECTED' ||
        decision.communicationRecovered ||
        decision.livenessRecovered)
    ) {
      this.publish({ eventType: 'NODE_UPDATED', payload: mutation.node });
    }

    const gatewayObservation = this.gatewaySequences.observe(envelope);
    if (gatewayObservation.kind === 'GAP') {
      this.logger.warn('Gateway sequence gap detected');
    }
    if (decision.kind === 'GAP') {
      this.diagnostics.sequenceGap(envelope.nodeMessage.nodeId, decision.gapSize, acceptedAt);
    }
    if (decision.kind === 'RESTART' || decision.kind === 'RESTART_SEQUENCE_UNEXPECTED') {
      this.diagnostics.nodeRestart(envelope.nodeMessage.nodeId, acceptedAt);
    }
    if (decision.communicationRecovered) {
      this.diagnostics.communicationRecovered(envelope.nodeMessage.nodeId, acceptedAt);
    }
    if (decision.livenessRecovered) {
      this.diagnostics.nodeRecovered(envelope.nodeMessage.nodeId, acceptedAt);
    }
    return 'ACCEPTED';
  }

  private parseTopic(topic: string): ParsedTopic | null {
    try {
      const parsed = parseNodeMqttTopic(topic);
      return { kind: 'NODE', nodeId: parsed.nodeId, topicKind: parsed.kind };
    } catch {
      try {
        const parsed = parseGatewayStatusTopic(topic);
        return { kind: 'GATEWAY', gatewayId: parsed.gatewayId };
      } catch {
        return null;
      }
    }
  }

  private decodePayload(payload: Uint8Array): Record<string, unknown> | null {
    try {
      const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload));
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private publish(event: Parameters<RealtimePublisherPort['publish']>[0]): void {
    try {
      this.publisher.publish(event);
    } catch {
      this.logger.warn('Realtime MQTT-normalized publication failed');
    }
  }
}
