
export enum NodeType {
  HEAD = 'HEAD',
  WORKER = 'WORKER'
}

export enum NodeStatus {
  IDLE = 'IDLE',
  COMPUTING = 'COMPUTING',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE'
}

export interface ClusterNode {
  id: string;
  type: NodeType;
  name: string;
  gpuUtil: number; // 0-100
  vramUtil: number; // 0-100
  temp: number; // Celsius
  status: NodeStatus;
  activeTokens: number; // Currently processing tokens
}

export interface RequestPacket {
  id: string;
  progress: number; // 0-100
  totalTokens: number;
  parallelShards: number; // How many GPUs it is split across
  color: string;
  targetNodeId?: string; // For single-device models
}

export interface MetricPoint {
  timestamp: number;
  totalThroughput: number; // tokens/sec
  avgLatency: number; // ms
  clusterUtilization: number; // %
  queueDepth: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  paramSize: string;
  vramPerGpu: number; // Approximate % usage on A100
  tpSize: number; // Tensor Parallel size (1 = single gpu, >1 = distributed)
  tokensPerSec: number; // Base speed factor
  description: string;
}

export type SimulationState = {
  nodes: ClusterNode[];
  requests: RequestPacket[];
  metricsHistory: MetricPoint[];
  systemTime: number;
  activeModelId: string;
};

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetId?: string; // For highlighting UI elements
}
