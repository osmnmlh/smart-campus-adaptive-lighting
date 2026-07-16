import {
  ScenarioDefinitionSchema,
  ScenarioRunStatus,
  SystemSnapshotSchema,
  type ScenarioDefinition,
  type ScenarioRunStatus as ScenarioRunStatusValue,
  type SystemSnapshot,
} from '@smart-campus/contracts';

import { ScenarioEventQueue } from './scenario-event-queue.js';
import { ScenarioStateError, ScenarioValidationError } from './scenario-errors.js';
import {
  appendLifecycleEvent,
  applyTemporalPolicies,
  reduceScenarioEvent,
} from './scenario-reducer.js';
import { createInitialScenarioState, type ScenarioState } from './scenario-state.js';
import { VirtualClock } from './virtual-clock.js';

export const ALLOWED_SCENARIO_SPEEDS = [0.5, 1, 2, 5] as const;
export type ScenarioSpeed = (typeof ALLOWED_SCENARIO_SPEEDS)[number];

export interface ScenarioExecutionStatus {
  status: ScenarioRunStatusValue;
  nowMs: number;
  durationMs: number;
  remainingEvents: number;
  speed: ScenarioSpeed;
}

export interface LoadScenarioOptions {
  speed?: ScenarioSpeed;
}

const cloneSnapshot = (snapshot: SystemSnapshot): SystemSnapshot =>
  JSON.parse(JSON.stringify(snapshot)) as SystemSnapshot;

export class ScenarioEngine {
  private readonly epochUtc: string;

  private clock: VirtualClock;

  private definition: ScenarioDefinition | null = null;

  private queue: ScenarioEventQueue | null = null;

  private state: ScenarioState | null = null;

  private status: ScenarioRunStatusValue = ScenarioRunStatus.IDLE;

  private speed: ScenarioSpeed = 1;

  constructor(epochUtc: string) {
    this.epochUtc = epochUtc;
    this.clock = new VirtualClock(epochUtc);
  }

  static create(epochUtc: string): ScenarioEngine {
    return new ScenarioEngine(epochUtc);
  }

  loadScenario(input: unknown, options: LoadScenarioOptions = {}): SystemSnapshot {
    const parsed = ScenarioDefinitionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ScenarioValidationError(`Invalid scenario definition: ${parsed.error.message}`);
    }

    const speed = options.speed ?? 1;
    if (!(ALLOWED_SCENARIO_SPEEDS as readonly number[]).includes(speed)) {
      throw new ScenarioValidationError('Scenario speed must be one of 0.5, 1, 2, or 5');
    }

    this.definition = parsed.data;
    this.speed = speed;
    this.clock = new VirtualClock(this.epochUtc);
    this.queue = new ScenarioEventQueue(parsed.data.events, parsed.data.durationMs);
    this.state = createInitialScenarioState(parsed.data, this.clock.toIsoTimestamp());
    this.status = ScenarioRunStatus.IDLE;
    return this.getSnapshot();
  }

  start(): SystemSnapshot {
    if (this.status !== ScenarioRunStatus.IDLE) {
      throw new ScenarioStateError('Scenario can only start from IDLE');
    }

    this.requireLoaded();
    this.status = ScenarioRunStatus.RUNNING;
    this.state = appendLifecycleEvent(
      this.state!,
      this.clock.toIsoTimestamp(),
      'SCENARIO_STARTED',
      'Scenario started',
    );
    return this.getSnapshot();
  }

  pause(): SystemSnapshot {
    if (this.status !== ScenarioRunStatus.RUNNING) {
      throw new ScenarioStateError('Only a running scenario can be paused');
    }

    this.status = ScenarioRunStatus.PAUSED;
    this.state = appendLifecycleEvent(
      this.requireState(),
      this.clock.toIsoTimestamp(),
      'SCENARIO_PAUSED',
      'Scenario paused',
    );
    return this.getSnapshot();
  }

  resume(): SystemSnapshot {
    if (this.status !== ScenarioRunStatus.PAUSED) {
      throw new ScenarioStateError('Only a paused scenario can be resumed');
    }

    this.status = ScenarioRunStatus.RUNNING;
    this.state = appendLifecycleEvent(
      this.requireState(),
      this.clock.toIsoTimestamp(),
      'SCENARIO_RESUMED',
      'Scenario resumed',
    );
    return this.getSnapshot();
  }

  reset(): SystemSnapshot {
    const definition = this.requireDefinition();
    this.clock = new VirtualClock(this.epochUtc);
    this.queue = new ScenarioEventQueue(definition.events, definition.durationMs);
    this.state = createInitialScenarioState(definition, this.clock.toIsoTimestamp());
    this.status = ScenarioRunStatus.IDLE;
    return this.getSnapshot();
  }

  advanceBy(ms: number): SystemSnapshot {
    if (!Number.isInteger(ms) || ms < 0) {
      throw new ScenarioValidationError('advanceBy ms must be a non-negative integer');
    }

    if (this.status === ScenarioRunStatus.COMPLETED) return this.getSnapshot();
    return this.advanceTo(this.clock.nowMs() + ms);
  }

  advanceTo(ms: number): SystemSnapshot {
    if (!Number.isInteger(ms) || ms < this.clock.nowMs()) {
      throw new ScenarioValidationError('advanceTo must be an integer at or after current time');
    }

    this.requireLoaded();
    if (this.status === ScenarioRunStatus.IDLE) {
      throw new ScenarioStateError('Scenario must be started before advancing');
    }
    if (this.status === ScenarioRunStatus.PAUSED || this.status === ScenarioRunStatus.COMPLETED) {
      return this.getSnapshot();
    }

    const definition = this.requireDefinition();
    const queue = this.requireQueue();
    const targetMs = Math.min(ms, definition.durationMs);
    const events = queue.consumeThrough(targetMs);

    events.forEach((event) => {
      this.clock.advanceTo(event.atMs);
      this.state = applyTemporalPolicies(
        this.requireState(),
        this.clock.nowMs(),
        this.clock.toIsoTimestamp(),
      );
      this.state = reduceScenarioEvent(
        this.state,
        event,
        this.clock.nowMs(),
        this.clock.toIsoTimestamp(),
      );
    });

    this.clock.advanceTo(targetMs);
    this.state = applyTemporalPolicies(
      this.requireState(),
      this.clock.nowMs(),
      this.clock.toIsoTimestamp(),
    );

    if (targetMs === definition.durationMs) {
      this.status = ScenarioRunStatus.COMPLETED;
      this.state = appendLifecycleEvent(
        this.state,
        this.clock.toIsoTimestamp(),
        'SCENARIO_COMPLETED',
        'Scenario completed',
      );
    }

    return this.getSnapshot();
  }

  getSnapshot(): SystemSnapshot {
    const state = this.requireState();
    const snapshot = SystemSnapshotSchema.parse({
      schemaVersion: 1,
      snapshotAt: this.clock.toIsoTimestamp(),
      scenarioRunId: state.scenarioId,
      systemMode: state.systemMode,
      dayPhase: state.dayPhase,
      lux: state.lux,
      direction: state.direction,
      nodes: state.nodes,
      lamps: state.lamps,
      sensors: state.sensors,
      activeAlerts: state.activeAlerts,
      recentEvents: state.recentEvents,
      instantPower: state.instantPower,
      energyConsumed: state.energyConsumed,
      baselineEnergy: state.baselineEnergy,
      estimatedSavingPercent: state.estimatedSavingPercent,
    });

    return cloneSnapshot(snapshot);
  }

  getExecutionStatus(): ScenarioExecutionStatus {
    return {
      status: this.status,
      nowMs: this.clock.nowMs(),
      durationMs: this.definition?.durationMs ?? 0,
      remainingEvents: this.queue?.remainingCount() ?? 0,
      speed: this.speed,
    };
  }

  private requireLoaded(): void {
    this.requireDefinition();
    this.requireQueue();
    this.requireState();
  }

  private requireDefinition(): ScenarioDefinition {
    if (this.definition === null) throw new ScenarioStateError('No scenario is loaded');
    return this.definition;
  }

  private requireQueue(): ScenarioEventQueue {
    if (this.queue === null) throw new ScenarioStateError('No scenario queue is loaded');
    return this.queue;
  }

  private requireState(): ScenarioState {
    if (this.state === null) throw new ScenarioStateError('No scenario state is loaded');
    return this.state;
  }
}
