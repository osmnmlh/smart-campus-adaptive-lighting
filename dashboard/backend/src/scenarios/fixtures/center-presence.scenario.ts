import { createFixture } from './fixture-defaults.js';

export const centerPresenceScenario = createFixture({
  id: 'center-presence',
  name: 'Center presence',
  description: 'IR3 confirms center presence without inferring a direction.',
  durationMs: 10_000,
  events: [
    {
      atMs: 1_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR3 center presence',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    },
    {
      atMs: 3_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR3 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-3' },
      payload: {},
    },
  ],
  tags: ['motion', 'center', 'directionless'],
});
