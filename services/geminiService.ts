import { GoogleGenAI } from "@google/genai";

// Helper to get AI client safely
const getAiClient = () => {
  if (process.env.API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return null;
};

export const askTutor = async (question: string, contextStr: string, isDemoMode: boolean = false): Promise<string> => {
  if (isDemoMode) {
    return mockAskTutor(question);
  }

  if (!process.env.API_KEY) return "Gemini API Key is missing. Please configure the environment or switch to DEMO mode.";
  
  const ai = getAiClient();
  if (!ai) return "Failed to initialize Gemini client.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are an expert AI Infrastructure Engineer teaching a student about GPU Clusters, Ray, and vLLM.
        
        Current Simulation Context:
        ${contextStr}

        User Question: "${question}"

        Provide a concise, technical, but easy-to-understand answer (max 3 sentences). 
        Explain how it relates to the current visual simulation of nodes and tokens.
      `
    });
    return response.text || "I couldn't generate an answer right now.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to the AI Tutor. Check your network or API Key, or switch to DEMO mode.";
  }
};

const mockAskTutor = async (question: string): Promise<string> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

  const q = question.toLowerCase();

  if (q.includes('latency') || q.includes('slow') || q.includes('ttft') || q.includes('lag')) {
      return "Latency (TTFT) spikes when the network is saturated or during the compute-heavy 'Prefill' phase. Check the 'Net Util' bars on the nodes or try upgrading to 400G InfiniBand.";
  }
  
  if (q.includes('vram') || q.includes('memory') || q.includes('oom') || q.includes('capacity')) {
      return "VRAM holds the active model weights and the dynamic KV Cache. If usage hits 100% (Red), nodes will fail. You need to add more nodes or switch to a smaller model (e.g., TinyLlama).";
  }
  
  if (q.includes('throughput') || q.includes('speed') || q.includes('fast') || q.includes('token')) {
      return "Throughput (Tokens/sec) scales with the number of worker nodes. However, single-request generation speed is limited by the specific GPU type (e.g., H100 is ~3x faster than A100).";
  }
  
  if (q.includes('network') || q.includes('bandwidth') || q.includes('eth') || q.includes('ib')) {
      return "Network bandwidth is the main bottleneck for Distributed Inference (TP). If you run Llama-405B on 10G Ethernet, the synchronization overhead will crush performance.";
  }
  
  if (q.includes('cost') || q.includes('billing') || q.includes('money') || q.includes('price')) {
      return "Cost is calculated based on active GPU hours. Newer GPUs like H100s cost more per hour but process tokens significantly faster, often resulting in a lower cost per 1k tokens.";
  }

  if (q.includes('ray') || q.includes('head') || q.includes('scheduler')) {
      return "Ray serves as the cluster operating system. The Head Node (Blue) maintains the global state and schedules tasks onto Worker Nodes based on their real-time resource availability.";
  }

  return "That's a great question about AI Infrastructure. In this simulation, try experimenting with different 'Placement Strategies' in the header to see how they affect cluster efficiency and latency.";
};