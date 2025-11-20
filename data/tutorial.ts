import { TutorialStep } from "../types";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-0',
    title: '1. The Ray Cluster',
    content: 'This visualizes a large GPU cluster with 10 Servers (20 GPUs total). The top node is the "Head Node" (CPU-only) managing the swarm. This setup mimics a real production environment for Enterprise LLMs.',
    targetId: 'cluster-view'
  },
  {
    id: 'step-1',
    title: '2. Model Loading & VRAM',
    content: 'Switching models changes memory topology. TinyLlama (1.1B) takes minimal VRAM, allowing many independent replicas. Llama 405B is massive (800GB+), filling almost all VRAM across the entire cluster just to load weights.',
    targetId: 'model-selector'
  },
  {
    id: 'step-2',
    title: '3. Parallelism Strategies',
    content: 'Observe the particle flow. For TinyLlama, requests go to single servers (Data Parallelism). For Llama 405B, shards hit ALL servers simultaneously, triggering massive inter-node data transfer (AllReduce) visible as mesh links between servers.',
    targetId: 'cluster-view'
  },
  {
    id: 'step-3',
    title: '4. Batching & Throughput',
    content: 'vLLM\'s Continuous Batching fills gaps in computation. With TinyLlama, throughput is high (thousands of tokens/s). With 405B, throughput drops due to network overhead and compute intensity, but it enables reasoning capabilities impossible on smaller models.',
    targetId: 'metrics-dashboard'
  },
  {
    id: 'step-4',
    title: '5. Live Traffic Tracing',
    content: 'The sidebar tracks every single user interaction in real-time. Watch how different requests have vastly different latencies depending on the complexity of the prompt and the current cluster load.',
    targetId: 'sidebar-activity'
  },
  {
    id: 'step-5',
    title: '6. Cluster Economics',
    content: 'GPU compute is expensive! This tracker estimates the hourly burn rate. Balancing high throughput (Performance) against cost (Efficiency) is the primary job of an AI Infrastructure Engineer.',
    targetId: 'cluster-stats-header'
  },
  {
    id: 'step-6',
    title: '7. AI Tutor',
    content: 'Still confused? Click the floating action button to chat with our AI Tutor. It uses Gemini 1.5 Flash to answer specific questions about this simulation or GPU architecture in general.',
    targetId: 'chat-widget-btn'
  }
];