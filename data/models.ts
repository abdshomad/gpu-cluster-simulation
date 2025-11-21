
import { ModelConfig } from '../types';

export const MODELS: Record<string, ModelConfig> = {
  'tiny-llama': {
    id: 'tiny-llama',
    name: 'TinyLlama 1.1B',
    paramSize: '1.1B',
    vramRequiredGB: 2.5,
    tpSize: 1,
    tokensPerSec: 180,
    description: 'Small, fast model. Replicated across all servers for high throughput load balancing.',
    costPer1kTokens: 0.0002
  },
  'gemma-2-27b': {
    id: 'gemma-2-27b',
    name: 'Gemma 2 27B',
    paramSize: '27B',
    vramRequiredGB: 56, // FP16
    tpSize: 1,
    tokensPerSec: 120,
    description: 'Efficient Google model. High throughput and reasoning balance on single nodes.',
    costPer1kTokens: 0.0005
  },
  'llama-3-70b': {
    id: 'llama-3-70b',
    name: 'Meta Llama 3 70B',
    paramSize: '70B',
    vramRequiredGB: 140, // FP16
    tpSize: 1,
    tokensPerSec: 75,
    description: 'The open-weight standard. Needs high VRAM (A100/H100) or quantization.',
    costPer1kTokens: 0.0007
  },
  'qwen-2.5-72b': {
    id: 'qwen-2.5-72b',
    name: 'Qwen 2.5 72B',
    paramSize: '72B',
    vramRequiredGB: 144,
    tpSize: 1,
    tokensPerSec: 60,
    description: 'Powerful open weights model. Maxes out single-node VRAM capacity.',
    costPer1kTokens: 0.002
  },
  'command-r-plus': {
    id: 'command-r-plus',
    name: 'Command R+',
    paramSize: '104B',
    vramRequiredGB: 210, // Needs multi-gpu single node or quantization
    tpSize: 1,
    tokensPerSec: 45,
    description: 'RAG-optimized powerhouse. Requires ~210GB VRAM.',
    costPer1kTokens: 0.001
  },
  'mistral-large': {
    id: 'mistral-large',
    name: 'Mistral Large 2',
    paramSize: '123B',
    vramRequiredGB: 246,
    tpSize: 1, // Might need TP on smaller cards, but assuming big nodes
    tokensPerSec: 50,
    description: 'Flagship model from Mistral AI. Strong reasoning and coding capabilities.',
    costPer1kTokens: 0.003
  },
  'mixtral-8x22b': {
    id: 'mixtral-8x22b',
    name: 'Mixtral 8x22B',
    paramSize: '141B (MoE)',
    vramRequiredGB: 280, // MoE active params lower, but weights need VRAM
    tpSize: 1,
    tokensPerSec: 40,
    description: 'Massive MoE model. Pushes the absolute limits of a single node.',
    costPer1kTokens: 0.0012
  },
  'llama-405b': {
    id: 'llama-405b',
    name: 'Meta Llama 3.1 405B',
    paramSize: '405B',
    vramRequiredGB: 820, // FP16
    tpSize: 8, // Distributed across 8+ GPUs minimum
    tokensPerSec: 25,
    description: 'Massive frontier model. Requires sharding across the entire cluster.',
    costPer1kTokens: 0.01
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    paramSize: '671B (MoE)',
    vramRequiredGB: 700, // Compressed/MoE usually run somewhat smaller but still huge
    tpSize: 8,
    tokensPerSec: 20,
    description: 'State-of-the-art reasoning model. Massive MoE requiring full cluster distribution.',
    costPer1kTokens: 0.008
  }
};
