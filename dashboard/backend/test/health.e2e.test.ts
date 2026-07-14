import 'reflect-metadata';

import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleReference.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns HTTP 200 with the minimal health response', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: '@smart-campus/backend',
      contracts: {
        package: '@smart-campus/contracts',
        schemaVersion: 1,
      },
    });
    expect(new Date(response.body.timestamp).toISOString()).toBe(response.body.timestamp);
    expect(response.body).not.toHaveProperty('telemetry');
    expect(response.body).not.toHaveProperty('nodes');
    expect(response.body).not.toHaveProperty('database');
    expect(response.body).not.toHaveProperty('mqtt');
  });
});
