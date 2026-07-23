import type {
  Alert,
  CommunicationHealth,
  CommunicationNodeId,
  EventLog,
  NodeSnapshot,
  NodeTransportEnvelopeV1,
  RealtimeDomainEventDraftV1,
  UtcTimestamp,
} from '@smart-campus/contracts';

export const LIVE_READ_MODEL_UPDATE = Symbol('LIVE_READ_MODEL_UPDATE');

export interface AcceptedNodeMessageUpdate {
  message: NodeTransportEnvelopeV1;
  acceptedAt: UtcTimestamp;
  communicationHealth: CommunicationHealth;
  sequenceGapCount: number;
}

export interface LiveReadModelMutation {
  node: NodeSnapshot;
  primaryEvent: RealtimeDomainEventDraftV1;
}

export interface LiveReadModelUpdatePort {
  applyNodeMessage(update: AcceptedNodeMessageUpdate): LiveReadModelMutation;
  markNodeOffline(nodeId: CommunicationNodeId, observedAt: UtcTimestamp): NodeSnapshot;
  upsertAlert(alert: Alert): Alert;
  findAlert(alertId: string): Alert | null;
  appendLog(log: EventLog): EventLog;
}
