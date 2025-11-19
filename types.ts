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
}

export interface MetricPoint {
  timestamp: number;
  totalThroughput: number; // tokens/sec
  avgLatency: number; // ms
  clusterUtilization: number; // %
  queueDepth: number;
}

export type SimulationState = {
  nodes: ClusterNode[];
  requests: RequestPacket[];
  metricsHistory: MetricPoint[];
  systemTime: number;
};

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetId?: string; // For highlighting UI elements
}