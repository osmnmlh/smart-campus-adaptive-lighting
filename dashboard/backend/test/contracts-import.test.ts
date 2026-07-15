import {
  SchemaVersionSchema,
  SystemMode,
  type SystemMode as SystemModeValue,
} from '@smart-campus/contracts';

import { CONTRACTS_SCHEMA_VERSION, CONTRACTS_SMOKE_MODE } from '../src/lib/contracts-smoke.js';

describe('shared contracts package import', () => {
  it('supports runtime imports from the package root', () => {
    expect(SchemaVersionSchema.parse(1)).toBe(1);
    expect(CONTRACTS_SCHEMA_VERSION).toBe(1);
  });

  it('supports type imports from the package root', () => {
    const mode: SystemModeValue = SystemMode.AUTO_ADAPTIVE;

    expect(CONTRACTS_SMOKE_MODE).toBe(mode);
  });
});
