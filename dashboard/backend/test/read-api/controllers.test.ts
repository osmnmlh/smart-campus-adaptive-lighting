import 'reflect-metadata';

import { Test, type TestingModule } from '@nestjs/testing';

import { ApiRequestError } from '../../src/common/http/api-errors.js';
import { AlertsReadController } from '../../src/modules/alerts/alerts-read.controller.js';
import { LogsReadController } from '../../src/modules/logs/logs-read.controller.js';
import { ReadModelModule } from '../../src/modules/read-model/read-model.module.js';
import { ScenariosReadController } from '../../src/modules/scenarios/scenarios-read.controller.js';
import { SystemReadController } from '../../src/modules/system/system-read.controller.js';

describe('read API controllers', () => {
  let moduleReference: TestingModule;
  let system: SystemReadController;
  let alerts: AlertsReadController;
  let logs: LogsReadController;
  let scenarios: ScenariosReadController;

  beforeAll(async () => {
    moduleReference = await Test.createTestingModule({ imports: [ReadModelModule] }).compile();
    system = moduleReference.get(SystemReadController);
    alerts = moduleReference.get(AlertsReadController);
    logs = moduleReference.get(LogsReadController);
    scenarios = moduleReference.get(ScenariosReadController);
  });

  afterAll(async () => {
    await moduleReference.close();
  });

  it('maps snapshot GET to the snapshot service', () => {
    expect(system.getSnapshot()).toMatchObject({
      data: { snapshotAt: '2026-06-15T20:30:00.000Z' },
      meta: { dataSource: 'SIMULATED', deterministic: true },
    });
  });

  it('maps validated alert list query to the list service', () => {
    expect(alerts.list({ status: 'ACTIVE' }).meta.filteredCount).toBe(5);
  });

  it('maps validated alert identifier to the detail service', () => {
    expect(alerts.get('ALERT_SIM_001').data.id).toBe('ALERT_SIM_001');
  });

  it('blocks invalid alert input before the application service', () => {
    expect(() => alerts.list({ severity: 'warning' })).toThrowError(ApiRequestError);
    expect(() => alerts.get('../ALERT_SIM_001')).toThrowError(ApiRequestError);
  });

  it('maps validated log list query to the list service', () => {
    expect(logs.list({ level: 'ERROR', limit: '100' }).meta.filteredCount).toBe(2);
  });

  it('maps validated log identifier to the detail service', () => {
    expect(logs.get('LOG_SIM_035').data.id).toBe('LOG_SIM_035');
  });

  it('blocks invalid log input before the application service', () => {
    expect(() => logs.list({ category: 'DEVICE' })).toThrowError(ApiRequestError);
    expect(() => logs.get('../LOG_SIM_001')).toThrowError(ApiRequestError);
  });

  it('maps scenario catalog and detail reads', () => {
    expect(scenarios.list().data).toHaveLength(5);
    expect(scenarios.get('node-offline').data.eventCount).toBe(2);
  });

  it('blocks invalid scenario identifiers before the application service', () => {
    expect(() => scenarios.get('node_offline')).toThrowError(ApiRequestError);
  });
});
