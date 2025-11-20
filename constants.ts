
import { ClusterNode, NodeType, NodeStatus, ModelConfig } from './types';

export const MODELS: Record<string, ModelConfig> = {
  'tiny-llama': {
    id: 'tiny-llama',
    name: 'TinyLlama 1.1B',
    paramSize: '1.1B',
    vramPerGpu: 8, // Fits easily, low usage
    tpSize: 1, // Replicated on every node
    tokensPerSec: 180,
    description: 'Small, fast model. Replicated across all servers for high throughput load balancing.',
    costPer1kTokens: 0.0002
  },
  'gemma-2-27b': {
    id: 'gemma-2-27b',
    name: 'Gemma 2 27B',
    paramSize: '27B',
    vramPerGpu: 20, // ~54GB total, fits on 1 node
    tpSize: 1,
    tokensPerSec: 120,
    description: 'Efficient Google model. High throughput and reasoning balance on single nodes.',
    costPer1kTokens: 0.0005
  },
  'llama-3-70b': {
    id: 'llama-3-70b',
    name: 'Meta Llama 3 70B',
    paramSize: '70B',
    vramPerGpu: 45, // ~75GB, comfortably fits on 1 node
    tpSize: 1,
    tokensPerSec: 75,
    description: 'The open-weight standard. Excellent balance of performance and cost on single nodes.',
    costPer1kTokens: 0.0007
  },
  'qwen-2.5-72b': {
    id: 'qwen-2.5-72b',
    name: 'Qwen 2.5 72B',
    paramSize: '72B',
    vramPerGpu: 48, // ~144GB total, fits tightly on 1 node (2x A100)
    tpSize: 1,
    tokensPerSec: 60,
    description: 'Powerful open weights model. Maxes out single-node VRAM capacity.',
    costPer1kTokens: 0.002
  },
  'command-r-plus': {
    id: 'command-r-plus',
    name: 'Command R+',
    paramSize: '104B',
    vramPerGpu: 60, // Large, heavy usage on single node
    tpSize: 1,
    tokensPerSec: 45,
    description: 'RAG-optimized powerhouse. Requires significant VRAM headroom.',
    costPer1kTokens: 0.001
  },
  'mistral-large': {
    id: 'mistral-large',
    name: 'Mistral Large 2',
    paramSize: '123B',
    vramPerGpu: 65, // ~120GB+, fits on 1 node (2x A100) comfortably but high usage
    tpSize: 1,
    tokensPerSec: 50,
    description: 'Flagship model from Mistral AI. Strong reasoning and coding capabilities.',
    costPer1kTokens: 0.003
  },
  'mixtral-8x22b': {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B',
    paramSize: '141B (MoE)',
    vramPerGpu: 80, // Very high, pushing single node limits
    tpSize: 1,
    tokensPerSec: 40,
    description: 'Massive MoE model. Pushes the absolute limits of a single 2x A100 node.',
    costPer1kTokens: 0.0012
  },
  'llama-405b': {
    id: 'llama-405b',
    name: 'Meta Llama 3.1 405B',
    paramSize: '405B',
    vramPerGpu: 85, // Massive usage (~800GB total needed)
    tpSize: 10, // Distributed across all 10 servers (20 GPUs)
    tokensPerSec: 25,
    description: 'Massive frontier model. Requires sharding across the entire cluster (Tensor Parallelism).',
    costPer1kTokens: 0.01
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    paramSize: '671B (MoE)',
    vramPerGpu: 92, // Very High
    tpSize: 10, // Full cluster
    tokensPerSec: 20,
    description: 'State-of-the-art reasoning model. Massive MoE requiring full cluster distribution.',
    costPer1kTokens: 0.008
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
  activeTokens: 0,
  totalVram: 160 // 2x 80GB A100
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
    activeTokens: 0,
    totalVram: 32 // System RAM fallback
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

export const USER_NAMES = [
  "Alice", "Bob", "Charlie", "Dave", "Eve", "Frank", "Grace", "Heidi", "Ivan", "Judy", 
  "Mallory", "Nia", "Oscar", "Peggy", "Rupert", "Sybil", "Ted", "Victor", "Walter"
];

export const USER_AVATARS = ["👨‍💻", "👩‍💻", "👨‍🎓", "👩‍🔬", "👨‍🚀", "🦸‍♀️", "🧙‍♂️", "🧛‍♀️", "🤖", "👽"];

export const MOCK_PROMPTS = [
  { text: "Write a Python script to scrape a website", tokens: 300 },
  { text: "Explain Quantum Entanglement like I'm 5", tokens: 150 },
  { text: "Generate a SQL query for users table", tokens: 80 },
  { text: "Write a haiku about GPUs", tokens: 40 },
  { text: "Debug this React useEffect hook...", tokens: 250 },
  { text: "Translate 'Hello World' to French", tokens: 20 },
  { text: "Summarize the history of Rome", tokens: 500 },
  { text: "What is the capital of Australia?", tokens: 15 },
  { text: "Write a bedtime story about a robot", tokens: 400 },
  { text: "Convert JSON to CSV in pandas", tokens: 120 },
  { text: "Explain Transformer architecture", tokens: 600 },
  { text: "Recipe for chocolate cake", tokens: 200 },
  { text: "Who won the 1994 World Cup?", tokens: 30 },
  { text: "Implement QuickSort in Rust", tokens: 350 },
  { text: "Define 'closure' in JavaScript", tokens: 100 },
  { text: "Analyze the sentiment of this text", tokens: 60 },
  { text: "Create a marketing plan for coffee", tokens: 450 },
  { text: "Refactor this legacy Java code", tokens: 300 },
  { text: "Explain how DNS works", tokens: 200 },
  { text: "Generate a unit test for login", tokens: 180 }
];

export const TUTORIAL_STEPS = [
  {
    id: 0,
    title: '1. The Ray Cluster',
    content: 'This visualizes a large GPU cluster with 10 Servers (20 GPUs total). The top node is the "Head Node" (CPU-only) managing the swarm. This setup mimics a real production environment for Enterprise LLMs.',
    targetId: 'cluster-view'
  },
  {
    id: 1,
    title: '2. Model Loading & VRAM',
    content: 'Switching models changes memory topology. TinyLlama (1.1B) takes minimal VRAM, allowing many independent replicas. Llama 405B is massive (800GB+), filling almost all VRAM across the entire cluster just to load weights.',
    targetId: 'model-selector'
  },
  {
    id: 2,
    title: '3. Parallelism Strategies',
    content: 'Observe the particle flow. For TinyLlama, requests go to single servers (Data Parallelism). For Llama 405B, every request splits into shards hitting ALL servers simultaneously (Tensor Parallelism).',
    targetId: 'cluster-view'
  },
  {
    id: 3,
    title: '4. Batching & Throughput',
    content: 'vLLM\'s Continuous Batching fills gaps in computation. With TinyLlama, throughput is high (thousands of tokens/s). With 405B, throughput drops due to network overhead and compute intensity, but it enables reasoning capabilities impossible on smaller models.',
    targetId: 'metrics-dashboard'
  }
];
