
import { ClusterNode, NodeType, NodeStatus, ModelConfig } from './types';

export const MODELS: Record<string, ModelConfig> = {
  'tiny-llama': {
    id: 'tiny-llama',
    name: 'TinyLlama 1.1B',
    paramSize: '1.1B',
    vramPerGpu: 8, // Fits easily, low usage
    tpSize: 1, // Replicated on every node
    tokensPerSec: 180,
    description: 'Small, fast model. Replicated across all servers for high throughput load balancing.'
  },
  'llama-405b': {
    id: 'llama-405b',
    name: 'Meta Llama 3.1 405B',
    paramSize: '405B',
    vramPerGpu: 85, // Massive usage (~800GB total needed)
    tpSize: 10, // Distributed across all 10 servers (20 GPUs)
    tokensPerSec: 25,
    description: 'Massive frontier model. Requires sharding across the entire cluster (Tensor Parallelism).'
  }
};

// Generate 10 workers (Servers)
// Each represents a physical node with 2x A100 GPUs
const workers: ClusterNode[] = Array.from({ length: 10 }, (_, i) => ({
  id: `server-${i + 1}`,
  type: NodeType.WORKER,
  name: `Server ${i + 1} (2x A100)`,
  gpuUtil: 0,
  vramUtil: 0,
  temp: 30,
  status: NodeStatus.IDLE,
  activeTokens: 0
}));

export const INITIAL_NODES: ClusterNode[] = [
  {
    id: 'head-1',
    type: NodeType.HEAD,
    name: 'Ray Head Node',
    gpuUtil: 0,
    vramUtil: 5,
    temp: 45,
    status: NodeStatus.IDLE,
    activeTokens: 0
  },
  ...workers
];

export const COLORS = {
  ray: '#0284c7', // sky-600
  vllm: '#e11d48', // rose-600
  success: '#10b981',
  warning: '#f59e0b',
  text: '#f8fafc',
  grid: '#334155',
  cubeTop: '#334155',
  cubeSide: '#1e293b',
  cubeFront: '#0f172a'
};

export const TUTORIAL_STEPS = [
  {
    id: 0,
    title: '1. The Ray Cluster',
    content: 'This visualizes a large GPU cluster with 10 Servers (20 GPUs total). The top node is the "Head Node" (CPU-only) managing the swarm. This setup mimics a real production environment for Enterprise LLMs.',
  },
  {
    id: 1,
    title: '2. Model Loading & VRAM',
    content: 'Switching models changes memory topology. TinyLlama (1.1B) takes minimal VRAM, allowing many independent replicas. Llama 405B is massive (800GB+), filling almost all VRAM across the entire cluster just to load weights.',
  },
  {
    id: 2,
    title: '3. Parallelism Strategies',
    content: 'Observe the particle flow. For TinyLlama, requests go to single servers (Data Parallelism). For Llama 405B, every request splits into shards hitting ALL servers simultaneously (Tensor Parallelism).',
  },
  {
    id: 3,
    title: '4. Batching & Throughput',
    content: 'vLLM\'s Continuous Batching fills gaps in computation. With TinyLlama, throughput is high (thousands of tokens/s). With 405B, throughput drops due to network overhead and compute intensity, but it enables reasoning capabilities impossible on smaller models.',
  }
];
