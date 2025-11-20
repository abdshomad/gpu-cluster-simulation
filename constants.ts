import { ClusterNode, NodeType, NodeStatus, NetworkSpeed } from './types';

export * from './data/models';
export * from './data/users';
export * from './data/tutorial';

export const NETWORK_CAPACITY: Record<NetworkSpeed, { name: string, bandwidth: number, label: string, latency: number }> = {
  [NetworkSpeed.ETH_10G]: { name: '10GbE Ethernet', bandwidth: 1.25, label: '10G', latency: 50 },
  [NetworkSpeed.ETH_100G]: { name: '100GbE Fabric', bandwidth: 12.5, label: '100G', latency: 10 },
  [NetworkSpeed.IB_400G]: { name: '400G InfiniBand', bandwidth: 50.0, label: '400G', latency: 1 }
};

// Generate 10 workers (Servers)
// Assign Rack 1 to first 5, Rack 2 to next 5
const workers: ClusterNode[] = Array.from({ length: 10 }, (_, i) => ({
  id: `server-${i + 1}`,
  type: NodeType.WORKER,
  name: `Server ${i + 1} (2x A100)`,
  gpuUtil: 0,
  vramUtil: 0,
  netUtil: 0,
  temp: 30,
  status: NodeStatus.IDLE,
  activeTokens: 0,
  totalVram: 160, // 2x 80GB A100
  rackId: i < 5 ? 'rack-1' : 'rack-2'
}));

export const INITIAL_NODES: ClusterNode[] = [
  {
    id: 'head-1',
    type: NodeType.HEAD,
    name: 'Ray Head Node',
    gpuUtil: 0,
    vramUtil: 5,
    netUtil: 0,
    temp: 45,
    status: NodeStatus.IDLE,
    activeTokens: 0,
    totalVram: 32
  },
  ...workers
];

export const COLORS = {
  ray: '#0284c7',
  vllm: '#e11d48',
  success: '#10b981',
  warning: '#f59e0b',
  text: '#f8fafc',
  grid: '#334155',
  cubeTop: '#334155',
  cubeSide: '#1e293b',
  cubeFront: '#0f172a'
};