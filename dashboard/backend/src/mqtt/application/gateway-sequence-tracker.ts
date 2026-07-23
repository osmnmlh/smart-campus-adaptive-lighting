import { Injectable } from '@nestjs/common';
import type { GatewayMqttEnvelopeV1 } from '@smart-campus/contracts';

export interface GatewaySequenceState {
  gatewayBootId: string;
  latestGatewaySequence: number;
  gapCount: number;
  restartCount: number;
}

export type GatewaySequenceObservation =
  | { kind: 'FIRST' | 'NEXT' | 'GAP' | 'RESTART'; gapSize: number }
  | { kind: 'STALE_BOOT' | 'STALE_SEQUENCE'; gapSize: 0 };

const bootCounter = (bootId: string): number => Number(bootId.slice('BOOT_'.length));

@Injectable()
export class GatewaySequenceTracker {
  private state: GatewaySequenceState | null = null;

  observe(envelope: GatewayMqttEnvelopeV1): GatewaySequenceObservation {
    if (this.state === null) {
      this.state = {
        gatewayBootId: envelope.gatewayBootId,
        latestGatewaySequence: envelope.gatewaySequence,
        gapCount: 0,
        restartCount: 0,
      };
      return { kind: 'FIRST', gapSize: 0 };
    }

    const incomingBoot = bootCounter(envelope.gatewayBootId);
    const currentBoot = bootCounter(this.state.gatewayBootId);
    if (incomingBoot < currentBoot) return { kind: 'STALE_BOOT', gapSize: 0 };
    if (incomingBoot > currentBoot) {
      this.state = {
        gatewayBootId: envelope.gatewayBootId,
        latestGatewaySequence: envelope.gatewaySequence,
        gapCount: this.state.gapCount,
        restartCount: this.state.restartCount + 1,
      };
      return { kind: 'RESTART', gapSize: Math.max(0, envelope.gatewaySequence - 1) };
    }
    if (envelope.gatewaySequence <= this.state.latestGatewaySequence) {
      return { kind: 'STALE_SEQUENCE', gapSize: 0 };
    }

    const gapSize = Math.max(0, envelope.gatewaySequence - this.state.latestGatewaySequence - 1);
    this.state.latestGatewaySequence = envelope.gatewaySequence;
    this.state.gapCount += gapSize;
    return { kind: gapSize > 0 ? 'GAP' : 'NEXT', gapSize };
  }

  getState(): GatewaySequenceState | null {
    return this.state === null ? null : { ...this.state };
  }
}
