

import { TutorialStep } from "../types";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-0',
    title: '1. Welcome to the Cluster Sim',
    content: 'This is an interactive simulation of a Ray & vLLM inference cluster. You will learn how hardware, network speed, and model size impact performance in distributed AI systems.',
    targetId: 'cluster-view'
  },
  {
    id: 'step-1',
    title: '2. Live vs Demo Mode',
    content: 'Toggle between "Demo" and "Live". Demo mode uses simulated AI responses. LIVE mode connects to the actual Gemini API to answer your questions using the "AI Tutor" button.',
    targetId: 'demo-live-switch'
  },
  {
    id: 'step-2',
    title: '3. Cluster Templates',
    content: 'Quickly switch between common industry setups. "Standard HPC" uses A100s (Training workhorses), while "Visual Inference" uses L40S GPUs optimized for graphics and inference.',
    targetId: 'header-templates'
  },
  {
    id: 'step-3',
    title: '4. Custom Hardware Config',
    content: 'Want total control? Open this menu to scale your cluster from 2 to 24 nodes, change GPUs per node (1-8), and select specific architectures like the NVIDIA H100 or the new Blackwell B200.',
    targetId: 'header-hardware'
  },
  {
    id: 'step-4',
    title: '5. Model Selection',
    content: 'Choose which LLMs to host. Small models (TinyLlama) fit everywhere. Huge models (Llama-405B) require "Tensor Parallelism", splitting one model across multiple GPUs (indicated by purple links).',
    targetId: 'model-selector'
  },
  {
    id: 'step-5',
    title: '6. Network Bandwidth',
    content: 'Distributed inference is highly sensitive to network latency. Upgrade to 400G InfiniBand to reduce the "All-Reduce" synchronization time required for distributed models.',
    targetId: 'header-network'
  },
  {
    id: 'step-6',
    title: '7. Placement Strategy',
    content: 'Decide how Ray places workloads. "PACK" fills one rack first to minimize latency. "SPREAD" distributes across racks for High Availability (HA) in case a rack fails.',
    targetId: 'header-placement'
  },
  {
    id: 'step-7',
    title: '8. Load Balancing',
    content: 'For single-node models, choose how requests are routed. "Round Robin" is simple, while "Least Connections" sends traffic to the least busy node.',
    targetId: 'header-lb'
  },
  {
    id: 'step-8',
    title: '9. Real-time Telemetry',
    content: 'Monitor key metrics: "Tokens/Sec" (Throughput) and "TTFT" (Latency). Watch VRAM usage—if it hits 100%, nodes will crash or swap, killing performance.',
    targetId: 'metrics-dashboard'
  },
  {
    id: 'step-9',
    title: '10. Ask the AI Tutor',
    content: 'Have questions? Click the chat button. In "LIVE" mode, it uses Google Gemini 2.5 to explain what is happening in your specific simulation configuration.',
    targetId: 'chat-widget-btn'
  }
];