import 'reflect-metadata';

import { HealthController } from '../src/health/health.controller.js';
import { HealthService } from '../src/health/health.service.js';

describe('HealthController', () => {
  const controller = new HealthController(new HealthService());

  it('returns the minimal healthy response', () => {
    const response = controller.getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('@smart-campus/backend');
    expect(response.contracts).toEqual({
      package: '@smart-campus/contracts',
      schemaVersion: 1,
    });
  });

  it('returns a valid UTC ISO 8601 timestamp', () => {
    const { timestamp } = controller.getHealth();

    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
    expect(timestamp).toMatch(/Z$/);
  });
});
