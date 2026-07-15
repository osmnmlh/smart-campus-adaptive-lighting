import {
  SchemaVersionSchema,
  SystemMode,
  type SystemMode as SystemModeValue,
} from '@smart-campus/contracts';

export const CONTRACTS_PACKAGE_NAME = '@smart-campus/contracts' as const;
export const CONTRACTS_SCHEMA_VERSION = SchemaVersionSchema.parse(1);
export const CONTRACTS_SMOKE_MODE: SystemModeValue = SystemMode.AUTO_ADAPTIVE;
