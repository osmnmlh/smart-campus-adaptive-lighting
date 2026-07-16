import {
  DayPhase,
  SystemMode,
  type ScenarioDefinition,
  type ScenarioEvent,
} from '@smart-campus/contracts';

interface FixtureInput {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  events: ScenarioEvent[];
  tags: string[];
}

export const createFixture = (input: FixtureInput): ScenarioDefinition => ({
  id: input.id,
  name: input.name,
  description: input.description,
  tickMs: 1_000,
  durationMs: input.durationMs,
  initialState: {
    systemMode: SystemMode.AUTO_ADAPTIVE,
    dayPhase: DayPhase.NIGHT,
    lux: 5,
  },
  events: input.events,
  expectedOutcomes: [],
  tags: input.tags,
});
