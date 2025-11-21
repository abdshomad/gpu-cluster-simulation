

import { TutorialStep } from "../types";

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-0',
    title: '1. Ray Cluster Simulation',
    content: 'Welcome to the Ray & vLLM Cluster Simulator. This interactive tool helps you understand how Large Language Models (LLMs) run on distributed GPU infrastructure. You can configure hardware, network, and models to see real-time performance.',
    targetId: 'cluster-view'
  },
  {
    id: 'step-1',
    title: '2. Hardware Templates',
    content: 'Start here! Choose a preset cluster configuration. "Standard HPC" uses A100s (Training), "Visual Inference" uses L40S (Graphics/Inf), and "Hybrid" combines them. Different hardware affects VRAM capacity and Compute speed.',
    targetId: 'header-templates'
  },
  {
    id: 'step-2',
    title: '3. Custom Hardware Config',
    content: 'Want specific specs? Open this menu to adjust the total Node Count (2-24), GPUs per Node (1-8), and GPU Architecture (L4 to Blackwell B200). Watch the cluster rebuild instantly.',
    targetId: 'header-hardware'
  },
  {
    id: 'step-3',
    title: '4. Model Selection',
    content: 'Load different LLMs. Tiny models (1B) fit on single GPUs. Massive models (405B) require "Tensor Parallelism" (TP), forcing multiple GPUs to work together as one. If a model is too big for your hardware, it won\'t run!',
    targetId: 'model-selector'
  },
  {
    id: 'step-4',
    title: '5. Network Bottlenecks',
    content: 'Distributed AI is network-bound. Switch between 10G Ethernet, 100G Fabric, and 400G InfiniBand. Slow networks kill performance for large TP models due to the massive "All-Reduce" synchronization required between tokens.',
    targetId: 'header-network'
  },
  {
    id: 'step-5',
    title: '6. Visualizing Parallelism',
    content: 'Observe the traffic. Single dots are simple requests. Mesh-like connections between nodes represent Tensor Parallel communication. Glowing nodes are actively computing "Prefill" or "Decode" stages.',
    targetId: 'cluster-view'
  },
  {
    id: 'step-6',
    title: '7. Real-time Telemetry',
    content: 'Track "Tokens Per Second" (Throughput) and "Time To First Token" (Latency). Watch how VRAM fills up as you load more models. If the Network Graph spikes, your interconnect is the bottleneck.',
    targetId: 'metrics-dashboard'
  },
  {
    id: 'step-7',
    title: '8. Cost & Billing',
    content: 'Switch to the "Billing" tab in the dashboard or sidebar to see per-user usage. High-end GPUs cost more ($/hr), but might process requests faster, lowering the cost per token. It\'s a trade-off.',
    targetId: 'sidebar-activity'
  },
  {
    id: 'step-8',
    title: '9. AI Tutor',
    content: 'Have specific questions about Ray, vLLM, or GPU architecture? Ask the AI Tutor. It has full context of your current simulation state.',
    targetId: 'chat-widget-btn'
  }
];