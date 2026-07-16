import '@xyflow/react/dist/style.css';
import { TopologyDashboard } from '@/components/topology/topology-dashboard';
import { createTopologyGraph } from '@/features/topology/topology-adapter';
import { topologySnapshot } from '@/features/topology/topology-fixture';

const topologyGraph = createTopologyGraph(topologySnapshot);

export default function TopologyPage() {
  return <TopologyDashboard initialGraph={topologyGraph} />;
}
