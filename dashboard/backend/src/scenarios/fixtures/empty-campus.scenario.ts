import { createFixture } from './fixture-defaults.js';

export const emptyCampusScenario = createFixture({
  id: 'empty-campus',
  name: 'Empty campus',
  description: 'Night-time standby state without motion or faults.',
  durationMs: 60_000,
  events: [],
  tags: ['empty', 'standby', 'deterministic'],
});
