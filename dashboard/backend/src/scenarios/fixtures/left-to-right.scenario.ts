import { createFixture } from './fixture-defaults.js';

export const leftToRightScenario = createFixture({
  id: 'left-to-right',
  name: 'Left to right',
  description: 'IR1 followed by IR2 confirms left-to-right presence.',
  durationMs: 50_000,
  events: [
    {
      atMs: 1_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR1 entry',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
      payload: {},
    },
    {
      atMs: 2_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR2 confirms direction',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
      payload: {},
    },
    {
      atMs: 5_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR1 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-1' },
      payload: {},
    },
    {
      atMs: 6_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR2 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-2' },
      payload: {},
    },
  ],
  tags: ['motion', 'left-to-right', 'hold', 'fade'],
});
