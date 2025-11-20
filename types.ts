

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

export enum LoadBalancingStrategy {
  RANDOM = 'RANDOM',
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS'
}

export interface ClusterNode {
  id: string;
  type: NodeType;
  name: string;
  gpuUtil: number; // 0-100
  vramUtil: number; // 0-100
  netUtil: number; // 0-100 (NIC Usage)
  temp: number; // Celsius
  status: NodeStatus;
  activeTokens: number; // Currently processing tokens
  totalVram: number; // Total VRAM in GB
}

export interface RequestPacket {
  id: string;
  modelId: string;
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
  totalBandwidth: number; // GB/s (Network/Interconnect)
  queueDepth: number;
  activeUsers: number;
  estimatedCostPerHour: number; // $
  avgGpuTemp: number; // Celsius
  nodeActiveTokens: Record<string, number>; // Active tokens per node
  nodeGpuUtil: Record<string, number>; // GPU Util per node
  nodeVramUtil: Record<string, number>; // VRAM Util per node
  nodeTemp: Record<string, number>; // Temp per node
}

export interface ModelConfig {
  id: string;
  name: string;
  paramSize: string;
  vramPerGpu: number; // Approximate % usage on A100
  tpSize: number; // Tensor Parallel size (1 = single gpu, >1 = distributed)
  tokensPerSec: number; // Base speed factor
  description: string;
  costPer1kTokens: number; // Est cost
}

export enum UserState {
  IDLE = 'IDLE', // Thinking
  SENDING = 'SENDING', // Generating prompt
  WAITING = 'WAITING', // Waiting for LLM response
  READING = 'READING' // Reading the response
}

export interface VirtualUser {
  id: string;
  name: string;
  state: UserState;
  currentRequestId?: string;
  timer: number; // Ticks remaining in current state
  color: string;
  avatar: string; // Emoji
  totalCost: number; // Accumulated cost in $
}

export interface LogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userAvatar: string;
  userColor: string;
  type: 'PROMPT' | 'RESPONSE';
  text: string;
  latency?: number;
}

export type SimulationState = {
  nodes: ClusterNode[];
  requests: RequestPacket[];
  metricsHistory: MetricPoint[];
  systemTime: number;
  activeModelIds: string[];
  virtualUsers: VirtualUser[];
  activityLog: LogEntry[];
};

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetId?: string; // For highlighting UI elements
}