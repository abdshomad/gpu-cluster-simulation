

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

export enum PlacementStrategy {
  PACK = 'PACK',     // Fill Rack 1 first (Low Latency)
  SPREAD = 'SPREAD',  // Distribute across Racks (High Availability)
  STRICT_PACK = 'STRICT_PACK' // Fail if Rack 1 full/offline
}

export enum NetworkSpeed {
  ETH_10G = 'ETH_10G',
  ETH_100G = 'ETH_100G',
  IB_400G = 'IB_400G'
}

export enum RequestStage {
  TRANSFER = 'TRANSFER', // Network travel
  PREFILL = 'PREFILL',   // Processing prompt (TTFT)
  DECODE = 'DECODE'      // Generating tokens
}

export type GpuType = 'L4' | 'L40S' | 'A100' | 'H100' | 'H200' | 'B200';

export interface GpuSpec {
  label: string;
  vram: number; // GB per GPU
  perfFactor: number; // Relative compute multiplier (A100 = 1.0)
  memBandwidth: number; // GB/s
}

export interface ClusterNode {
  id: string;
  type: NodeType;
  name: string;
  gpuUtil: number; // 0-100
  vramUtil: number; // 0-100
  netUtil: number; // 0-100 (NIC Usage relative to capacity)
  temp: number; // Celsius
  status: NodeStatus;
  activeTokens: number; // Currently processing tokens
  totalVram: number; // Total VRAM in GB (gpusPerNode * gpuVram)
  rackId?: string; // 'rack-1' or 'rack-2'
  
  // Hardware Config
  gpuType: GpuType;
  gpusCount: number;
}

export interface RequestPacket {
  id: string;
  modelId: string;
  stage: RequestStage;
  progress: number; // 0-100 (Relative to current stage)
  promptTokens: number; // Input size
  outputTokens: number; // Output size
  parallelShards: number; // How many GPUs it is split across
  color: string;
  targetNodeId?: string; // For single-device models
  targetNodeIds?: string[]; // For distributed TP models (list of nodes in the ring)
  startTime: number;
  ttft?: number; // Time To First Token (ms)
}

export interface MetricPoint {
  timestamp: number;
  totalThroughput: number; // tokens/sec (Decode speed)
  avgLatency: number; // ms (Total Request Latency)
  avgTtft: number; // ms (Time To First Token)
  clusterUtilization: number; // %
  totalBandwidth: number; // GB/s (Network/Interconnect - Inter-node)
  totalNvLinkBandwidth: number; // GB/s (NVLink - Intra-node)
  networkLimit: number; // GB/s (Current Max Capacity)
  queueDepth: number;
  activeUsers: number;
  estimatedCostPerHour: number; // $
  avgGpuTemp: number; // Celsius
  nodeActiveTokens: Record<string, number>; // Active tokens per node
  nodeGpuUtil: Record<string, number>; // GPU Util per node
  nodeVramUtil: Record<string, number>; // VRAM Util per node
  nodeNetUtil: Record<string, number>; // Network Util per node
  nodeTemp: Record<string, number>; // Temp per node
  modelVramUsage: Record<string, number>; // Total VRAM (GB) per model across cluster
}

export interface ModelConfig {
  id: string;
  name: string;
  paramSize: string;
  vramRequiredGB: number; // Absolute Memory footprint in GB
  tpSize: number; // Tensor Parallel size (1 = single gpu, >1 = distributed)
  tokensPerSec: number; // Base speed factor (Decode)
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
  totalTokens: number; // Accumulated tokens used
  requestCount: number; // Total requests made
}

// The "Prometheus" style metric (Low Cardinality)
export interface ClusterMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

// The "Loki" style log aggregate (High Cardinality)
export interface UserBillingLog {
  userId: string;
  userName: string;
  requestCount: number;
  totalTokens: number;
  estimatedCost: number; // e.g. $0.002 per 1k tokens
  lastActive: string;
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
  ttft?: number;
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
