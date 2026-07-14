import { SystemMode, SystemModeSchema, SystemSnapshotSchema } from '@smart-campus/contracts';
import { contractsSmoke } from '@/lib/contracts-smoke';

describe('shared contracts package', () => {
  it('canonical değerleri package root üzerinden import eder', () => {
    expect(SystemMode.AUTO_ADAPTIVE).toBe('AUTO_ADAPTIVE');
    expect(typeof SystemSnapshotSchema.safeParse).toBe('function');
    expect(contractsSmoke.systemSnapshotSchemaAvailable).toBe(true);
  });

  it('runtime schema ile minimal geçerli enum değerini doğrular', () => {
    expect(SystemModeSchema.safeParse(SystemMode.AUTO_ADAPTIVE).success).toBe(true);
    expect(contractsSmoke.validatesSystemMode).toBe(true);
  });
});
