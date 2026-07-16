import type { ScenarioDefinition, ScenarioEvent } from '@smart-campus/contracts';

import { ScenarioEngine } from '../domain/scenario-engine.js';
import { createFixture } from '../fixtures/fixture-defaults.js';

export const TEST_EPOCH_UTC = '2026-01-01T00:00:00.000Z';

export class ScenarioTestBuilder {
  private id = 'test-scenario';

  private durationMs = 10_000;

  private events: ScenarioEvent[] = [];

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withDuration(durationMs: number): this {
    this.durationMs = durationMs;
    return this;
  }

  withEvents(events: readonly ScenarioEvent[]): this {
    this.events = JSON.parse(JSON.stringify(events)) as ScenarioEvent[];
    return this;
  }

  build(): ScenarioDefinition {
    return createFixture({
      id: this.id,
      name: 'Scenario test fixture',
      description: 'Deterministic scenario assembled by ScenarioTestBuilder.',
      durationMs: this.durationMs,
      events: this.events,
      tags: ['test'],
    });
  }

  buildEngine(): ScenarioEngine {
    const engine = new ScenarioEngine(TEST_EPOCH_UTC);
    engine.loadScenario(this.build());
    return engine;
  }
}
