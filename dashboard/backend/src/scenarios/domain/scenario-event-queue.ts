import type { ScenarioEvent } from '@smart-campus/contracts';

import { ScenarioValidationError } from './scenario-errors.js';

interface OrderedEvent {
  event: ScenarioEvent;
  insertionOrder: number;
}

const cloneEvent = (event: ScenarioEvent): ScenarioEvent =>
  JSON.parse(JSON.stringify(event)) as ScenarioEvent;

export class ScenarioEventQueue {
  private readonly orderedEvents: OrderedEvent[];

  private cursor = 0;

  private consumedThroughMs: number;

  constructor(events: readonly ScenarioEvent[], durationMs: number, initialNowMs = 0) {
    if (!Number.isInteger(durationMs) || durationMs <= 0) {
      throw new ScenarioValidationError('durationMs must be a positive integer');
    }

    if (!Number.isInteger(initialNowMs) || initialNowMs < 0) {
      throw new ScenarioValidationError('initialNowMs must be a non-negative integer');
    }

    this.consumedThroughMs = initialNowMs;
    this.orderedEvents = events
      .map((event, insertionOrder) => {
        if (event.atMs < initialNowMs) {
          throw new ScenarioValidationError('Scenario event cannot be in the past');
        }

        if (event.atMs > durationMs) {
          throw new ScenarioValidationError('Scenario event must occur within durationMs');
        }

        return { event: cloneEvent(event), insertionOrder };
      })
      .sort(
        (left, right) =>
          left.event.atMs - right.event.atMs || left.insertionOrder - right.insertionOrder,
      );
  }

  consumeThrough(targetMs: number): ScenarioEvent[] {
    if (!Number.isInteger(targetMs) || targetMs < this.consumedThroughMs) {
      throw new ScenarioValidationError('Queue target must not move backwards');
    }

    const consumed: ScenarioEvent[] = [];

    while (
      this.cursor < this.orderedEvents.length &&
      this.orderedEvents[this.cursor]!.event.atMs <= targetMs
    ) {
      consumed.push(cloneEvent(this.orderedEvents[this.cursor]!.event));
      this.cursor += 1;
    }

    this.consumedThroughMs = targetMs;
    return consumed;
  }

  remainingCount(): number {
    return this.orderedEvents.length - this.cursor;
  }

  reset(): void {
    this.cursor = 0;
    this.consumedThroughMs = 0;
  }
}
