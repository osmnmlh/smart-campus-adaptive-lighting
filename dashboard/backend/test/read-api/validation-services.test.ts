import 'reflect-metadata';

import { Test, type TestingModule } from '@nestjs/testing';

import { ApiRequestError } from '../../src/common/http/api-errors.js';
import { parsePagination } from '../../src/common/pagination/pagination-parser.js';
import {
  parseAlertId,
  parseLogId,
  parseScenarioId,
} from '../../src/common/validation/identifier-validation.js';
import {
  parseAlertListQuery,
  parseLogListQuery,
} from '../../src/modules/read-model/application/read-query.parsers.js';
import {
  GetAlertService,
  GetLogService,
  GetScenarioService,
  GetSystemSnapshotService,
  ListAlertsService,
  ListLogsService,
  ListScenariosService,
} from '../../src/modules/read-model/application/read-services.js';
import { FIXED_AS_OF } from '../../src/modules/read-model/domain/read-model-models.js';
import { ReadModelModule } from '../../src/modules/read-model/read-model.module.js';

describe('read API validation and application services', () => {
  let moduleReference: TestingModule;
  let listAlerts: ListAlertsService;
  let getAlert: GetAlertService;
  let listLogs: ListLogsService;
  let getLog: GetLogService;
  let listScenarios: ListScenariosService;
  let getScenario: GetScenarioService;
  let getSnapshot: GetSystemSnapshotService;

  beforeAll(async () => {
    moduleReference = await Test.createTestingModule({ imports: [ReadModelModule] }).compile();
    listAlerts = moduleReference.get(ListAlertsService);
    getAlert = moduleReference.get(GetAlertService);
    listLogs = moduleReference.get(ListLogsService);
    getLog = moduleReference.get(GetLogService);
    listScenarios = moduleReference.get(ListScenariosService);
    getScenario = moduleReference.get(GetScenarioService);
    getSnapshot = moduleReference.get(GetSystemSnapshotService);
  });

  afterAll(async () => {
    await moduleReference.close();
  });

  it('parses default alert pagination and filters', () => {
    expect(parseAlertListQuery({})).toEqual({ offset: 0, limit: 25, timeRange: 'all' });
  });

  it('parses default log pagination and filters', () => {
    expect(parseLogListQuery({})).toEqual({ offset: 0, limit: 25, timeRange: 'all' });
  });

  it('parses all supported alert filters together', () => {
    expect(
      parseAlertListQuery({
        severity: 'WARNING',
        status: 'ACTIVE',
        entityId: 'node-3',
        timeRange: '60m',
        offset: '1',
        limit: '10',
      }),
    ).toEqual({
      severity: 'WARNING',
      status: 'ACTIVE',
      entityId: 'node-3',
      timeRange: '60m',
      offset: 1,
      limit: 10,
    });
  });

  it('parses all supported log filters together', () => {
    expect(
      parseLogListQuery({
        category: 'SENSOR',
        level: 'WARNING',
        entityId: 'sensor-ir-2',
        timeRange: '15m',
        offset: '0',
        limit: '1',
      }),
    ).toEqual({
      category: 'SENSOR',
      level: 'WARNING',
      entityId: 'sensor-ir-2',
      timeRange: '15m',
      offset: 0,
      limit: 1,
    });
  });

  it.each([
    ['severity', { severity: 'warning' }],
    ['status', { status: 'OPEN' }],
    ['entityId', { entityId: 'node-999' }],
    ['timeRange', { timeRange: '1h' }],
    ['unknown', { other: 'value' }],
  ])('rejects invalid alert query field %s', (_field, query) => {
    expect(() => parseAlertListQuery(query)).toThrowError(ApiRequestError);
  });

  it.each([
    ['category', { category: 'DEVICE' }],
    ['level', { level: 'CRITICAL' }],
    ['entityId', { entityId: 'sensor-unknown' }],
    ['timeRange', { timeRange: 'yesterday' }],
    ['unknown', { sort: 'asc' }],
  ])('rejects invalid log query field %s', (_field, query) => {
    expect(() => parseLogListQuery(query)).toThrowError(ApiRequestError);
  });

  it.each([
    [{ offset: '-1' }, 'negative offset'],
    [{ offset: '1.5' }, 'decimal offset'],
    [{ offset: '1e2' }, 'scientific offset'],
    [{ offset: '01' }, 'zero-prefixed offset'],
    [{ limit: '0' }, 'zero limit'],
    [{ limit: '-1' }, 'negative limit'],
    [{ limit: '1.5' }, 'decimal limit'],
    [{ limit: '101' }, 'oversized limit'],
    [{ limit: ['1', '2'] }, 'duplicate limit'],
    [{ limit: ' 1' }, 'whitespace-padded limit'],
  ])('rejects pagination input %j (%s)', (query, _description) => {
    expect(() => parsePagination(query), _description).toThrowError(ApiRequestError);
  });

  it.each([
    [
      { limit: '1', offset: '0' },
      { limit: 1, offset: 0 },
    ],
    [
      { limit: '100', offset: '999' },
      { limit: 100, offset: 999 },
    ],
  ])('accepts valid pagination boundaries', (query, expected) => {
    expect(parsePagination(query)).toEqual(expected);
  });

  it.each(['ALERT_SIM_001', 'ALERT_SIM_999'])('accepts valid alert identifier %s', (id) => {
    expect(parseAlertId(id)).toBe(id);
  });

  it.each(['alert_sim_001', 'ALERT_SIM_1', '../ALERT_SIM_001', 'ALERT_SIM_0001'])(
    'rejects invalid alert identifier %s',
    (id) => {
      expect(() => parseAlertId(id)).toThrowError(ApiRequestError);
    },
  );

  it.each(['LOG_SIM_001', 'LOG_SIM_999'])('accepts valid log identifier %s', (id) => {
    expect(parseLogId(id)).toBe(id);
  });

  it.each(['log_sim_001', 'LOG_SIM_1', '../LOG_SIM_001', 'LOG_SIM_0001'])(
    'rejects invalid log identifier %s',
    (id) => {
      expect(() => parseLogId(id)).toThrowError(ApiRequestError);
    },
  );

  it.each(['empty-campus', 'node-offline', 'unknown-scenario'])(
    'accepts canonical scenario identifier %s',
    (id) => {
      expect(parseScenarioId(id)).toBe(id);
    },
  );

  it.each(['Node Offline', '../node-offline', 'node_offline', 'a'.repeat(65)])(
    'rejects invalid scenario identifier %s',
    (id) => {
      expect(() => parseScenarioId(id)).toThrowError(ApiRequestError);
    },
  );

  it('returns deterministic snapshot response metadata', () => {
    const response = getSnapshot.execute();
    expect(response.meta).toEqual({
      asOf: FIXED_AS_OF,
      dataSource: 'SIMULATED',
      deterministic: true,
    });
    expect(response.data.snapshotAt).toBe(FIXED_AS_OF);
  });

  it('returns alerts newest first with accurate default metadata', () => {
    const response = listAlerts.execute(parseAlertListQuery({}));
    expect(response.data[0]!.id).toBe('ALERT_SIM_013');
    expect(response.meta).toMatchObject({
      total: 15,
      filteredCount: 15,
      returnedCount: 15,
      hasMore: false,
    });
  });

  it.each([
    ['INFO', 5],
    ['WARNING', 9],
    ['CRITICAL', 1],
  ] as const)('filters alerts by %s severity', (severity, expected) => {
    const response = listAlerts.execute(parseAlertListQuery({ severity }));
    expect(response.data).toHaveLength(expected);
    expect(response.data.every((alert) => alert.severity === severity)).toBe(true);
  });

  it.each([
    ['ACTIVE', 5],
    ['RESOLVED', 10],
  ] as const)('filters alerts by %s status', (status, expected) => {
    const response = listAlerts.execute(parseAlertListQuery({ status }));
    expect(response.data).toHaveLength(expected);
    expect(response.data.every((alert) => alert.status === status)).toBe(true);
  });

  it.each([
    ['15m', 5],
    ['60m', 7],
    ['24h', 15],
    ['all', 15],
  ] as const)('filters alerts by fixed %s range', (timeRange, expected) => {
    expect(listAlerts.execute(parseAlertListQuery({ timeRange })).meta.filteredCount).toBe(
      expected,
    );
  });

  it('combines alert filters without mutating repository input', () => {
    const query = parseAlertListQuery({ severity: 'WARNING', status: 'ACTIVE', timeRange: '15m' });
    const first = listAlerts.execute(query);
    const second = listAlerts.execute(query);
    expect(first).toEqual(second);
    expect(first.data).toHaveLength(4);
  });

  it('paginates alerts after stable sorting', () => {
    const response = listAlerts.execute(parseAlertListQuery({ offset: '1', limit: '1' }));
    expect(response.data).toHaveLength(1);
    expect(response.data[0]!.id).toBe('ALERT_SIM_009');
    expect(response.meta).toMatchObject({ returnedCount: 1, hasMore: true });
  });

  it('returns a safe empty alert page', () => {
    const response = listAlerts.execute(parseAlertListQuery({ offset: '99' }));
    expect(response.data).toEqual([]);
    expect(response.meta).toMatchObject({ filteredCount: 15, returnedCount: 0, hasMore: false });
  });

  it('gets an alert or raises typed not-found', () => {
    expect(getAlert.execute('ALERT_SIM_001').data.id).toBe('ALERT_SIM_001');
    expect(() => getAlert.execute('ALERT_SIM_999')).toThrowError(ApiRequestError);
  });

  it('returns logs newest first with stable sequence tie-breaking', () => {
    const response = listLogs.execute(parseLogListQuery({}));
    expect(response.data[0]!.id).toBe('LOG_SIM_042');
    expect(response.data.findIndex((log) => log.id === 'LOG_SIM_041')).toBeLessThan(
      response.data.findIndex((log) => log.id === 'LOG_SIM_040'),
    );
    expect(response.meta).toMatchObject({
      total: 42,
      filteredCount: 42,
      returnedCount: 25,
      hasMore: true,
    });
  });

  it.each([
    ['SYSTEM', 4],
    ['SCENARIO', 7],
    ['SENSOR', 8],
    ['DIRECTION', 2],
    ['LAMP', 7],
    ['NODE', 6],
    ['ALERT', 8],
  ] as const)('filters logs by %s category', (category, expected) => {
    const response = listLogs.execute(parseLogListQuery({ category, limit: '100' }));
    expect(response.data).toHaveLength(expected);
    expect(response.data.every((log) => log.metadata.category === category)).toBe(true);
  });

  it.each([
    ['INFO', 29],
    ['WARNING', 11],
    ['ERROR', 2],
  ] as const)('filters logs by %s level', (level, expected) => {
    const response = listLogs.execute(parseLogListQuery({ level, limit: '100' }));
    expect(response.data).toHaveLength(expected);
    expect(response.data.every((log) => log.metadata.level === level)).toBe(true);
  });

  it.each([
    ['15m', 10],
    ['60m', 18],
    ['24h', 42],
    ['all', 42],
  ] as const)('filters logs by fixed %s range', (timeRange, expected) => {
    const response = listLogs.execute(parseLogListQuery({ timeRange, limit: '100' }));
    expect(response.meta.filteredCount).toBe(expected);
  });

  it('combines log filters and entity selection', () => {
    const response = listLogs.execute(
      parseLogListQuery({ category: 'SENSOR', level: 'WARNING', entityId: 'sensor-ir-2' }),
    );
    expect(response.data.map((log) => log.id)).toEqual(['LOG_SIM_033']);
  });

  it('paginates logs after stable sorting', () => {
    const response = listLogs.execute(parseLogListQuery({ offset: '1', limit: '1' }));
    expect(response.data[0]!.id).toBe('LOG_SIM_041');
    expect(response.meta).toMatchObject({ returnedCount: 1, hasMore: true });
  });

  it('returns a safe empty log page', () => {
    const response = listLogs.execute(parseLogListQuery({ offset: '99' }));
    expect(response.data).toEqual([]);
    expect(response.meta).toMatchObject({ filteredCount: 42, returnedCount: 0, hasMore: false });
  });

  it('gets a log or raises typed not-found', () => {
    expect(getLog.execute('LOG_SIM_035').data.id).toBe('LOG_SIM_035');
    expect(() => getLog.execute('LOG_SIM_999')).toThrowError(ApiRequestError);
  });

  it('returns five scenarios with deterministic list metadata', () => {
    const response = listScenarios.execute();
    expect(response.data).toHaveLength(5);
    expect(response.meta).toMatchObject({
      total: 5,
      filteredCount: 5,
      returnedCount: 5,
      deterministic: true,
    });
  });

  it('gets a scenario or raises typed not-found', () => {
    expect(getScenario.execute('node-offline').data.id).toBe('node-offline');
    expect(() => getScenario.execute('unknown-scenario')).toThrowError(ApiRequestError);
  });
});
