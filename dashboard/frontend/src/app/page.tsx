import { OverviewDashboard } from '@/components/dashboard/overview-dashboard';
import { createOverviewModel } from '@/features/overview/overview-adapter';
import { overviewSnapshot } from '@/features/overview/overview-fixture';

const overviewModel = createOverviewModel(overviewSnapshot);

export default function HomePage() {
  return <OverviewDashboard model={overviewModel} />;
}
