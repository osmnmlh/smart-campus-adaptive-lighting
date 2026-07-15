import { Injectable } from '@nestjs/common';

import { CONTRACTS_PACKAGE_NAME, CONTRACTS_SCHEMA_VERSION } from '../lib/contracts-smoke.js';

export interface HealthResponse {
  status: 'ok';
  service: '@smart-campus/backend';
  timestamp: string;
  contracts: {
    package: '@smart-campus/contracts';
    schemaVersion: 1;
  };
}

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: '@smart-campus/backend',
      timestamp: new Date().toISOString(),
      contracts: {
        package: CONTRACTS_PACKAGE_NAME,
        schemaVersion: CONTRACTS_SCHEMA_VERSION,
      },
    };
  }
}
