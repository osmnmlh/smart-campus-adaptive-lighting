import { describe, expect, it } from 'vitest';
import {
  AlertSchema,
  ApiErrorSchema,
  NodeSchema,
  ScenarioDefinitionSchema,
  ScenarioEventSchema,
  WebSocketEventSchema,
} from '../src/index.js';
import { systemSnapshot, timestamp } from './fixtures.js';

const scenario = {
  id: 'day-to-night',
  name: 'Day to night',
  description: 'Moves the deterministic mock from day to night.',
  tickMs: 250,
  durationMs: 5000,
  initialState: { systemMode: 'AUTO_ADAPTIVE', dayPhase: 'DAY', lux: 500 },
  events: [
    {
      atMs: 1000,
      type: 'SET_LUX',
      payload: { lux: 20 },
      label: 'Lux falls below threshold',
    },
  ],
  expectedOutcomes: [
    {
      description: 'Night mode is derived',
      atMs: 1500,
      expectedPath: 'dayPhase',
      expectedValue: 'NIGHT',
    },
  ],
  tags: ['lighting', 'day-phase'],
};

describe('scenario and transport schemas', () => {
  it('accepts a controlled scenario definition', () => {
    expect(ScenarioDefinitionSchema.safeParse(scenario).success).toBe(true);
  });

  it('rejects an event beyond scenario duration', () => {
    expect(
      ScenarioDefinitionSchema.safeParse({
        ...scenario,
        events: [{ ...scenario.events[0], atMs: 5001 }],
      }).success,
    ).toBe(false);
  });

  it('rejects negative lux', () => {
    expect(
      ScenarioEventSchema.safeParse({
        atMs: 0,
        type: 'SET_LUX',
        payload: { lux: -1 },
        label: 'Invalid lux',
      }).success,
    ).toBe(false);
  });

  it('allows multiple events at the same timestamp without reordering input', () => {
    const events = [scenario.events[0], { ...scenario.events[0], label: 'Second event' }];
    const result = ScenarioDefinitionSchema.safeParse({ ...scenario, events });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events.map((event) => event.label)).toEqual([
        'Lux falls below threshold',
        'Second event',
      ]);
    }
  });

  it('rejects a WebSocket payload that does not match its event type', () => {
    expect(
      WebSocketEventSchema.safeParse({
        schemaVersion: 1,
        eventId: 'event-1',
        emittedAt: timestamp,
        type: 'alert.created',
        payload: systemSnapshot,
      }).success,
    ).toBe(false);
  });

  it('accepts JSON-compatible API error details', () => {
    expect(
      ApiErrorSchema.safeParse({
        code: 'INVALID_COMMAND',
        message: 'Command payload is invalid.',
        details: { fields: ['brightnessPercent'], retryable: false },
        correlationId: 'correlation-1',
        timestamp,
      }).success,
    ).toBe(true);
  });

  it('rejects function, Date, and undefined metadata values', () => {
    const alert = {
      id: 'alert-1',
      code: 'NODE_OFFLINE',
      status: 'ACTIVE',
      severity: 'CRITICAL',
      sourceEntity: { entityType: 'NODE', entityId: 'node-1' },
      startedAt: timestamp,
      lastObservedAt: timestamp,
      durationMs: 0,
      message: 'Node is offline.',
      probableCause: 'Heartbeat timeout.',
      recommendedAction: 'Inspect node power.',
    };
    expect(AlertSchema.safeParse({ ...alert, metadata: { fn: () => true } }).success).toBe(false);
    expect(AlertSchema.safeParse({ ...alert, metadata: { date: new Date() } }).success).toBe(false);
    expect(AlertSchema.safeParse({ ...alert, metadata: { value: undefined } }).success).toBe(false);
  });

  it('exposes fundamental schemas from the public index', () => {
    expect(NodeSchema).toBeDefined();
    expect(ScenarioDefinitionSchema).toBeDefined();
    expect(WebSocketEventSchema).toBeDefined();
  });
});
