import { SystemSnapshotSchema } from '@smart-campus/contracts';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

export const topologySnapshot = SystemSnapshotSchema.parse(overviewSnapshot);
