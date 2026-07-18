import 'reflect-metadata';

import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module.js';
import { ReadModelInvalidError } from '../../src/common/http/api-errors.js';

interface ResponseMeta {
  total?: number;
  filteredCount?: number;
  offset?: number;
  limit?: number;
  returnedCount?: number;
  hasMore?: boolean;
  asOf: string;
  dataSource: string;
  deterministic: boolean;
}

interface SuccessBody {
  data: unknown;
  meta: ResponseMeta;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: readonly { field: string; reason: string }[];
  };
}

@Controller('__read-api-test')
class ThrowingController {
  @Get('unexpected')
  fail(): never {
    throw new Error('C:\\private\\internal-path should never be returned');
  }

  @Get('read-model-invalid')
  invalidReadModel(): never {
    throw new ReadModelInvalidError();
  }
}

describe('deterministic read API e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ThrowingController],
    }).compile();
    app = moduleReference.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('preserves the health endpoint response', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', service: '@smart-campus/backend' });
    expect(response.body).not.toHaveProperty('data');
  });

  it('returns a deterministic system snapshot envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/system/snapshot').expect(200);
    const body = response.body as SuccessBody;
    expect(body.meta).toEqual({
      asOf: '2026-06-15T20:30:00.000Z',
      dataSource: 'SIMULATED',
      deterministic: true,
    });
    expect(body.data).toMatchObject({ snapshotAt: '2026-06-15T20:30:00.000Z' });
  });

  it('returns exactly the same snapshot twice', async () => {
    const first = await request(app.getHttpServer()).get('/api/v1/system/snapshot').expect(200);
    const second = await request(app.getHttpServer()).get('/api/v1/system/snapshot').expect(200);
    expect(first.body).toEqual(second.body);
  });

  it('lists alerts with accurate pagination metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/alerts').expect(200);
    const body = response.body as SuccessBody;
    expect(body.data).toHaveLength(15);
    expect(body.meta).toMatchObject({ total: 15, filteredCount: 15, returnedCount: 15 });
  });

  it.each([
    ['severity=WARNING', 9],
    ['status=ACTIVE', 5],
    ['timeRange=15m', 5],
  ])('filters alerts with %s', async (query, expected) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/alerts?${query}`).expect(200);
    expect((response.body as SuccessBody).meta.filteredCount).toBe(expected);
  });

  it('paginates alerts after sorting', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/alerts?limit=1&offset=0')
      .expect(200);
    const body = response.body as SuccessBody;
    expect(body.data).toHaveLength(1);
    expect(body.meta).toMatchObject({ limit: 1, offset: 0, returnedCount: 1, hasMore: true });
  });

  it('returns alert detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/alerts/ALERT_SIM_001')
      .expect(200);
    expect(response.body).toMatchObject({
      data: { id: 'ALERT_SIM_001' },
      meta: { dataSource: 'SIMULATED', deterministic: true },
    });
  });

  it('returns safe 404 for a format-valid unknown alert', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/alerts/ALERT_SIM_999')
      .expect(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'The requested alert was not found.' },
    });
  });

  it('returns safe 400 for an invalid alert identifier', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/alerts/not-valid').expect(400);
    expect((response.body as ErrorBody).error.code).toBe('INVALID_IDENTIFIER');
  });

  it('rejects invalid and duplicate alert query values', async () => {
    const invalid = await request(app.getHttpServer())
      .get('/api/v1/alerts?severity=warning')
      .expect(400);
    const duplicate = await request(app.getHttpServer())
      .get('/api/v1/alerts?limit=1&limit=2')
      .expect(400);
    expect((invalid.body as ErrorBody).error.code).toBe('INVALID_QUERY');
    expect((duplicate.body as ErrorBody).error.code).toBe('INVALID_QUERY');
  });

  it('lists logs with accurate default metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/logs').expect(200);
    const body = response.body as SuccessBody;
    expect(body.data).toHaveLength(25);
    expect(body.meta).toMatchObject({ total: 42, filteredCount: 42, returnedCount: 25 });
  });

  it.each([
    ['category=SENSOR&limit=100', 8],
    ['level=WARNING&limit=100', 11],
    ['timeRange=60m&limit=100', 18],
  ])('filters logs with %s', async (query, expected) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/logs?${query}`).expect(200);
    expect((response.body as SuccessBody).meta.filteredCount).toBe(expected);
  });

  it('paginates logs after stable sorting', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/logs?limit=1&offset=0')
      .expect(200);
    expect(response.body).toMatchObject({
      data: [{ id: 'LOG_SIM_042' }],
      meta: { total: 42, returnedCount: 1, hasMore: true },
    });
  });

  it('returns log detail', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/logs/LOG_SIM_035').expect(200);
    expect(response.body).toMatchObject({
      data: { id: 'LOG_SIM_035', message: 'NODE_2 went offline' },
      meta: { dataSource: 'SIMULATED', deterministic: true },
    });
  });

  it('returns safe 404 and 400 for log detail failures', async () => {
    const missing = await request(app.getHttpServer()).get('/api/v1/logs/LOG_SIM_999').expect(404);
    const invalid = await request(app.getHttpServer()).get('/api/v1/logs/not-valid').expect(400);
    expect((missing.body as ErrorBody).error.code).toBe('NOT_FOUND');
    expect((invalid.body as ErrorBody).error.code).toBe('INVALID_IDENTIFIER');
  });

  it('lists the five canonical scenarios', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/scenarios').expect(200);
    const body = response.body as SuccessBody;
    expect(body.data).toHaveLength(5);
    expect(body.meta).toMatchObject({ total: 5, dataSource: 'SIMULATED', deterministic: true });
  });

  it('returns deterministic scenario detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/scenarios/node-offline')
      .expect(200);
    expect(response.body).toMatchObject({
      data: { id: 'node-offline', simulated: true, eventCount: 2 },
      meta: { asOf: '2026-06-15T20:30:00.000Z', deterministic: true },
    });
  });

  it('returns safe 404 and 400 for scenario detail failures', async () => {
    const missing = await request(app.getHttpServer())
      .get('/api/v1/scenarios/unknown-scenario')
      .expect(404);
    const invalid = await request(app.getHttpServer())
      .get('/api/v1/scenarios/node_offline')
      .expect(400);
    expect((missing.body as ErrorBody).error.code).toBe('NOT_FOUND');
    expect((invalid.body as ErrorBody).error.code).toBe('INVALID_IDENTIFIER');
  });

  it.each([
    ['post', '/api/v1/alerts'],
    ['patch', '/api/v1/alerts/ALERT_SIM_001'],
    ['delete', '/api/v1/logs/LOG_SIM_001'],
    ['post', '/api/v1/scenarios'],
  ] as const)('does not expose %s %s', async (method, path) => {
    const response = await request(app.getHttpServer())[method](path).expect(404);
    expect((response.body as ErrorBody).error.code).toBe('NOT_FOUND');
  });

  it('maps unexpected errors to a generic safe 500 envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/__read-api-test/unexpected')
      .expect(500);
    const body = response.body as ErrorBody;
    expect(body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' },
    });
    expect(JSON.stringify(body)).not.toContain('internal-path');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('maps read-model validation failures without exposing schema details', async () => {
    const response = await request(app.getHttpServer())
      .get('/__read-api-test/read-model-invalid')
      .expect(500);
    expect(response.body).toEqual({
      error: {
        code: 'READ_MODEL_INVALID',
        message: 'The deterministic read model is unavailable.',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('issues');
  });
});
