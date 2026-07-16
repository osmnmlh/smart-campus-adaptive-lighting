import { createFixture } from './fixture-defaults.js';

export const nodeOfflineScenario = createFixture({
  id: 'node-offline',
  name: 'Node offline',
  description: 'NODE_2 loses communication and raises one deterministic alert.',
  durationMs: 5_000,
  events: [
    {
      atMs: 1_000,
      type: 'SET_NODE_ONLINE',
      label: 'NODE_2 goes offline',
      target: { entityType: 'NODE', entityId: 'node-2' },
      payload: { online: false },
    },
    {
      atMs: 2_000,
      type: 'SET_NODE_ONLINE',
      label: 'NODE_2 remains offline',
      target: { entityType: 'NODE', entityId: 'node-2' },
      payload: { online: false },
    },
  ],
  tags: ['fault', 'node-offline', 'alert'],
});
