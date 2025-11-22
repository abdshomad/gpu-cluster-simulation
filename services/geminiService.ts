import { GoogleGenAI } from "@google/genai";

export interface LiveConfig {
  endpointUrl?: string;
  apiKey?: string;
}

// Helper to get AI client safely
const getAiClient = (customKey?: string) => {
  const key = customKey || process.env.API_KEY;
  if (key) {
    return new GoogleGenAI({ apiKey: key });
  }
  return null;
};

export const askTutor = async (
  question: string, 
  contextStr: string, 
  isDemoMode: boolean = false,
  config?: LiveConfig
): Promise<string> => {
  if (isDemoMode) {
    return mockAskTutor(question);
  }

  // 1. Custom Endpoint URL Priority (e.g. Proxy)
  if (config?.endpointUrl) {
    try {
      const response = await fetch(config.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `
            Context: ${contextStr}
            Question: ${question}
          ` 
        })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return data.text || data.answer || data.response || JSON.stringify(data);
    } catch (error) {
      console.error("Custom Endpoint Error:", error);
      return `Error connecting to custom endpoint: ${config.endpointUrl}`;
    }
  }

  // 2. Google GenAI SDK (Default or Custom Key)
  const apiKey = config?.apiKey || process.env.API_KEY;
  if (!apiKey) return "Gemini API Key is missing. Please configure it in Settings or switch to DEMO mode.";
  
  const ai = getAiClient(apiKey);
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
    return "Error connecting to the AI Tutor. Check your API Key or network connection.";
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