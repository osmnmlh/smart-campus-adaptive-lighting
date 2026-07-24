import 'reflect-metadata';

import { Test, type TestingModule } from '@nestjs/testing';

import { AppModule } from '../src/app.module.js';
import { loadEnvironment } from '../src/common/config/environment.js';

describe('AppModule', () => {
  it('compiles in a Nest testing module', async () => {
    const moduleReference: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleReference).toBeDefined();
    await moduleReference.close();
  });
});

describe('environment configuration', () => {
  it('uses the loopback host by default', () => {
    expect(loadEnvironment({}).host).toBe('127.0.0.1');
  });

  it('uses port 3001 by default', () => {
    expect(loadEnvironment({}).port).toBe(3001);
  });

  it('rejects an invalid backend port', () => {
    expect(() => loadEnvironment({ BACKEND_PORT: '70000' })).toThrow('Invalid BACKEND_PORT');
  });

  it('parses and cleans comma-separated CORS origins', () => {
    const config = loadEnvironment({
      CORS_ORIGINS: 'http://localhost:3000, ,https://dashboard.example.test',
    });

    expect(config.corsOrigins).toEqual(['http://localhost:3000', 'https://dashboard.example.test']);
  });

  it('uses the documented MVP energy defaults', () => {
    const config = loadEnvironment({});
    expect(config.energyNominalLampPowerW).toBe(10);
    expect(config.energyMeasurementStaleMs).toBe(15_000);
    expect(config.energyMaxIntegrationGapMs).toBe(30_000);
  });

  it('rejects invalid nominal lamp powers', () => {
    for (const value of ['0', '-1', 'NaN', 'Infinity', '1001']) {
      expect(() => loadEnvironment({ ENERGY_NOMINAL_LAMP_POWER_W: value })).toThrow(
        'Invalid ENERGY_NOMINAL_LAMP_POWER_W',
      );
    }
  });

  it('rejects invalid measurement stale times', () => {
    for (const value of ['0', '-1', '1.5', '3600001']) {
      expect(() => loadEnvironment({ ENERGY_MEASUREMENT_STALE_MS: value })).toThrow(
        'Invalid ENERGY_MEASUREMENT_STALE_MS',
      );
    }
  });

  it('rejects invalid integration gaps', () => {
    for (const value of ['0', '-1', '1.5', '300001']) {
      expect(() => loadEnvironment({ ENERGY_MAX_INTEGRATION_GAP_MS: value })).toThrow(
        'Invalid ENERGY_MAX_INTEGRATION_GAP_MS',
      );
    }
  });
});
