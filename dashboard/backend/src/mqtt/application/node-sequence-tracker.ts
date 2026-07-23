import { Injectable } from '@nestjs/common';
import type {
  CommunicationHealth,
  CommunicationNodeId,
  NodeTransportEnvelopeV1,
  UtcTimestamp,
} from '@smart-campus/contracts';

const RECOVERY_NORMAL_SEQUENCE_COUNT = 3;

export interface NodeSequenceState {
  nodeId: CommunicationNodeId;
  latestBootId: string;
  latestSequence: number;
  latestUptimeMs: number;
  lastAcceptedAt: UtcTimestamp;
  sequenceGapCount: number;
  restartCount: number;
  consecutiveNormalAfterGap: number;
  communicationHealth: CommunicationHealth;
  online: boolean;
}

export type NodeSequenceDecision =
  | {
      accepted: true;
      kind: 'FIRST' | 'NEXT' | 'GAP' | 'RESTART' | 'RESTART_SEQUENCE_UNEXPECTED';
      nextState: NodeSequenceState;
      gapSize: number;
      communicationRecovered: boolean;
      livenessRecovered: boolean;
    }
  | {
      accepted: false;
      kind: 'STALE_BOOT' | 'STALE_SEQUENCE' | 'UPTIME_ROLLBACK';
    };

const bootCounter = (bootId: string): number => Number(bootId.slice('BOOT_'.length));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

@Injectable()
export class NodeSequenceTracker {
  private readonly states = new Map<CommunicationNodeId, NodeSequenceState>();

  evaluate(message: NodeTransportEnvelopeV1, acceptedAt: UtcTimestamp): NodeSequenceDecision {
    const current = this.states.get(message.nodeId);
    if (current === undefined) {
      return {
        accepted: true,
        kind: 'FIRST',
        nextState: {
          nodeId: message.nodeId,
          latestBootId: message.bootId,
          latestSequence: message.sequence,
          latestUptimeMs: message.uptimeMs,
          lastAcceptedAt: acceptedAt,
          sequenceGapCount: 0,
          restartCount: 0,
          consecutiveNormalAfterGap: 0,
          communicationHealth: 'HEALTHY',
          online: true,
        },
        gapSize: 0,
        communicationRecovered: false,
        livenessRecovered: false,
      };
    }

    const incomingBoot = bootCounter(message.bootId);
    const currentBoot = bootCounter(current.latestBootId);
    if (incomingBoot < currentBoot) return { accepted: false, kind: 'STALE_BOOT' };
    if (incomingBoot > currentBoot) {
      return {
        accepted: true,
        kind: message.sequence === 1 ? 'RESTART' : 'RESTART_SEQUENCE_UNEXPECTED',
        nextState: {
          ...clone(current),
          latestBootId: message.bootId,
          latestSequence: message.sequence,
          latestUptimeMs: message.uptimeMs,
          lastAcceptedAt: acceptedAt,
          restartCount: current.restartCount + 1,
          consecutiveNormalAfterGap: 0,
          communicationHealth: 'HEALTHY',
          online: true,
        },
        gapSize: message.sequence > 1 ? message.sequence - 1 : 0,
        communicationRecovered: current.communicationHealth !== 'HEALTHY',
        livenessRecovered: !current.online,
      };
    }

    if (message.uptimeMs < current.latestUptimeMs) {
      return { accepted: false, kind: 'UPTIME_ROLLBACK' };
    }
    if (message.sequence <= current.latestSequence) {
      return { accepted: false, kind: 'STALE_SEQUENCE' };
    }

    const gapSize = Math.max(0, message.sequence - current.latestSequence - 1);
    const hasGap = gapSize > 0;
    const consecutiveNormalAfterGap = hasGap
      ? 0
      : current.communicationHealth === 'DEGRADED'
        ? current.consecutiveNormalAfterGap + 1
        : 0;
    const communicationRecovered =
      current.communicationHealth === 'DEGRADED' &&
      consecutiveNormalAfterGap >= RECOVERY_NORMAL_SEQUENCE_COUNT;
    const communicationHealth: CommunicationHealth = hasGap
      ? 'DEGRADED'
      : communicationRecovered
        ? 'HEALTHY'
        : current.communicationHealth;

    return {
      accepted: true,
      kind: hasGap ? 'GAP' : 'NEXT',
      nextState: {
        ...clone(current),
        latestSequence: message.sequence,
        latestUptimeMs: message.uptimeMs,
        lastAcceptedAt: acceptedAt,
        sequenceGapCount: current.sequenceGapCount + gapSize,
        consecutiveNormalAfterGap: communicationRecovered ? 0 : consecutiveNormalAfterGap,
        communicationHealth,
        online: true,
      },
      gapSize,
      communicationRecovered,
      livenessRecovered: !current.online,
    };
  }

  commit(decision: Extract<NodeSequenceDecision, { accepted: true }>): void {
    this.states.set(decision.nextState.nodeId, clone(decision.nextState));
  }

  markOffline(nodeId: CommunicationNodeId): NodeSequenceState | null {
    const current = this.states.get(nodeId);
    if (current === undefined || !current.online) return null;
    const next = { ...clone(current), online: false };
    this.states.set(nodeId, next);
    return clone(next);
  }

  getState(nodeId: CommunicationNodeId): NodeSequenceState | null {
    const state = this.states.get(nodeId);
    return state === undefined ? null : clone(state);
  }

  listStates(): readonly NodeSequenceState[] {
    return [...this.states.values()].map((state) => clone(state));
  }
}
