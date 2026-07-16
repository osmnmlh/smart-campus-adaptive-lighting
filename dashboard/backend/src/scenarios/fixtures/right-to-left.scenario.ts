import { createFixture } from './fixture-defaults.js';

export const rightToLeftScenario = createFixture({
  id: 'right-to-left',
  name: 'Right to left',
  description: 'IR5 followed by IR4 confirms right-to-left presence.',
  durationMs: 50_000,
  events: [
    {
      atMs: 1_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR5 entry',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
      payload: {},
    },
    {
      atMs: 2_000,
      type: 'SENSOR_ACTIVATED',
      label: 'IR4 confirms direction',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
      payload: {},
    },
    {
      atMs: 5_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR5 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-5' },
      payload: {},
    },
    {
      atMs: 6_000,
      type: 'SENSOR_DEACTIVATED',
      label: 'IR4 clears',
      target: { entityType: 'SENSOR', entityId: 'sensor-ir-4' },
      payload: {},
    },
  ],
  tags: ['motion', 'right-to-left', 'hold', 'fade'],
});
