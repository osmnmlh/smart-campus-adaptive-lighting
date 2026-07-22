import 'reflect-metadata';

import { Test, type TestingModule } from '@nestjs/testing';
import { SystemSnapshotSchema } from '@smart-campus/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GetSystemSnapshotService } from '../../src/modules/read-model/application/read-services.js';
import { ReadModelModule } from '../../src/modules/read-model/read-model.module.js';
import { RealtimeSnapshotService } from '../../src/realtime/application/realtime-snapshot.service.js';

describe('RealtimeSnapshotService', () => {
  let moduleReference: TestingModule;
  let service: RealtimeSnapshotService;

  beforeAll(async () => {
    moduleReference = await Test.createTestingModule({ imports: [ReadModelModule] }).compile();
    service = new RealtimeSnapshotService(moduleReference.get(GetSystemSnapshotService));
  });

  afterAll(async () => {
    await moduleReference.close();
  });

  it('reuses the canonical read-model snapshot service', () => {
    expect(SystemSnapshotSchema.safeParse(service.getCurrentSnapshot()).success).toBe(true);
  });

  it('returns deterministic simulated snapshot content', () => {
    expect(service.getCurrentSnapshot()).toEqual(service.getCurrentSnapshot());
  });

  it('returns defensive snapshot copies', () => {
    const first = service.getCurrentSnapshot();
    first.nodes.splice(0);
    expect(service.getCurrentSnapshot().nodes.length).toBeGreaterThan(0);
  });

  it('rejects an invalid snapshot returned by the read service', () => {
    const invalidReadService = {
      execute: () => ({ data: { invalid: true }, meta: {} }),
    } as unknown as GetSystemSnapshotService;
    expect(() => new RealtimeSnapshotService(invalidReadService).getCurrentSnapshot()).toThrow();
  });
});
