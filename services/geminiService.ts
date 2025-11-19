import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const askTutor = async (question: string, contextStr: string): Promise<string> => {
  if (!apiKey) return "Gemini API Key is missing. Please configure the environment.";

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
    return "Error connecting to the AI Tutor.";
  }
};
