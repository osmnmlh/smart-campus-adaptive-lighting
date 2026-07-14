import { SystemMode, SystemModeSchema, SystemSnapshotSchema } from '@smart-campus/contracts';

export const contractsSmoke = Object.freeze({
  systemMode: SystemMode.AUTO_ADAPTIVE,
  validatesSystemMode: SystemModeSchema.safeParse(SystemMode.AUTO_ADAPTIVE).success,
  systemSnapshotSchemaAvailable: typeof SystemSnapshotSchema.safeParse === 'function',
});
