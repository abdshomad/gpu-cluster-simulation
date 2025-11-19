import { ClusterNode, NodeType, NodeStatus } from './types';

export const INITIAL_NODES: ClusterNode[] = [
  {
    id: 'head-1',
    type: NodeType.HEAD,
    name: 'Ray Head (CPU)',
    gpuUtil: 0,
    vramUtil: 15,
    temp: 45,
    status: NodeStatus.IDLE,
    activeTokens: 0
  },
  {
    id: 'worker-1',
    type: NodeType.WORKER,
    name: 'Worker 1 (A100)',
    gpuUtil: 0,
    vramUtil: 0,
    temp: 30,
    status: NodeStatus.IDLE,
    activeTokens: 0
  },
  {
    id: 'worker-2',
    type: NodeType.WORKER,
    name: 'Worker 2 (A100)',
    gpuUtil: 0,
    vramUtil: 0,
    temp: 30,
    status: NodeStatus.IDLE,
    activeTokens: 0
  },
  {
    id: 'worker-3',
    type: NodeType.WORKER,
    name: 'Worker 3 (A100)',
    gpuUtil: 0,
    vramUtil: 0,
    temp: 30,
    status: NodeStatus.IDLE,
    activeTokens: 0
  },
  {
    id: 'worker-4',
    type: NodeType.WORKER,
    name: 'Worker 4 (A100)',
    gpuUtil: 0,
    vramUtil: 0,
    temp: 30,
    status: NodeStatus.IDLE,
    activeTokens: 0
  }
];

export const COLORS = {
  ray: '#0284c7',
  vllm: '#e11d48',
  success: '#10b981',
  warning: '#f59e0b',
  text: '#f8fafc',
  grid: '#334155'
};
