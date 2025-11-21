
import { ClusterNode, NodeType, NodeStatus, NetworkSpeed, GpuSpec, GpuType } from './types';

export * from './data/models';
export * from './data/users';
export * from './data/tutorial';

export const NETWORK_CAPACITY: Record<NetworkSpeed, { name: string, bandwidth: number, label: string, latency: number }> = {
  [NetworkSpeed.ETH_10G]: { name: '10GbE Ethernet', bandwidth: 1.25, label: '10G', latency: 50 },
  [NetworkSpeed.ETH_100G]: { name: '100GbE Fabric', bandwidth: 12.5, label: '100G', latency: 10 },
  [NetworkSpeed.IB_400G]: { name: '400G InfiniBand', bandwidth: 50.0, label: '400G', latency: 1 }
};

export const GPU_SPECS: Record<GpuType, GpuSpec> = {
  'L4': { label: 'NVIDIA L4', vram: 24, perfFactor: 0.4, memBandwidth: 300 },
  'L40S': { label: 'NVIDIA L40S', vram: 48, perfFactor: 0.8, memBandwidth: 864 },
  'A100': { label: 'NVIDIA A100', vram: 80, perfFactor: 1.0, memBandwidth: 1935 },
  'H100': { label: 'NVIDIA H100', vram: 80, perfFactor: 2.5, memBandwidth: 3350 },
  'H200': { label: 'NVIDIA H200', vram: 141, perfFactor: 2.8, memBandwidth: 4800 },
  'B200': { label: 'NVIDIA Blackwell', vram: 192, perfFactor: 5.0, memBandwidth: 8000 },
};

export const generateCluster = (nodeCount: number, gpusPerNode: number, gpuType: GpuType): ClusterNode[] => {
  const spec = GPU_SPECS[gpuType];
  
  // Generate Workers
  const workers: ClusterNode[] = Array.from({ length: nodeCount }, (_, i) => ({
    id: `server-${i + 1}`,
    type: NodeType.WORKER,
    name: `Server ${i + 1} (${gpusPerNode}x ${gpuType})`,
    gpuUtil: 0,
    vramUtil: 0,
    netUtil: 0,
    temp: 30,
    status: NodeStatus.IDLE,
    activeTokens: 0,
    totalVram: spec.vram * gpusPerNode,
    rackId: i < Math.ceil(nodeCount / 2) ? 'rack-1' : 'rack-2',
    gpuType: gpuType,
    gpusCount: gpusPerNode
  }));

  // Head Node
  const head: ClusterNode = {
    id: 'head-1',
    type: NodeType.HEAD,
    name: 'Ray Head Node',
    gpuUtil: 0,
    vramUtil: 5,
    netUtil: 0,
    temp: 45,
    status: NodeStatus.IDLE,
    activeTokens: 0,
    totalVram: 32,
    gpuType: 'L4', // Dummy
    gpusCount: 0
  };

  return [head, ...workers];
};

export const INITIAL_NODES = generateCluster(10, 2, 'A100');

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
