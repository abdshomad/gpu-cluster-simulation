
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Square, Zap, Activity, Server, 
  Cpu, MessageCircle, BookOpen, ChevronRight, ChevronLeft, Database
} from 'lucide-react';
import { 
  SimulationState, NodeType, NodeStatus, MetricPoint, RequestPacket 
} from './types';
import { INITIAL_NODES, TUTORIAL_STEPS, MODELS } from './constants';
import ClusterVisualization from './components/ClusterVisualization';
import MetricsDashboard from './components/MetricsDashboard';
import { askTutor } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [simulationState, setSimulationState] = useState<SimulationState>({
    nodes: INITIAL_NODES,
    requests: [],
    metricsHistory: [],
    systemTime: 0,
    activeModelId: 'tiny-llama'
  });
  const [isRunning, setIsRunning] = useState(false);
  const [loadLevel, setLoadLevel] = useState(0); // 0 to 5
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Tutorial State
  const [tutorialStep, setTutorialStep] = useState<number | null>(null); // null = free mode
  
  // Tutor/Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Welcome to the Ray & vLLM Cluster Sim. Try switching between TinyLlama and Llama 405B to see how the cluster adapts!' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- Refs for Simulation Loop ---
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;

  // --- Simulation Logic ---
  const tick = useCallback(() => {
    const currentState = stateRef.current;
    const newTime = currentState.systemTime + 1;
    const currentModel = MODELS[currentState.activeModelId];

    // Tutorial overrides
    let effectiveLoadLevel = loadLevel;
    if (tutorialStep !== null) {
        if (tutorialStep === 0) effectiveLoadLevel = 0; 
        if (tutorialStep === 1) effectiveLoadLevel = 1; 
        if (tutorialStep === 2) effectiveLoadLevel = 4; 
        if (tutorialStep === 3) effectiveLoadLevel = 5; 
    }

    // 1. Generate New Requests
    let newRequests = [...currentState.requests];
    if (effectiveLoadLevel > 0) {
        const chance = effectiveLoadLevel * 0.1; 
        if (Math.random() < chance) {
            const reqId = `req-${newTime}-${Math.floor(Math.random() * 10000)}`;
            
            // Request Logic based on Model
            let parallelShards = 1;
            let targetNodeId = undefined;

            if (currentModel.tpSize > 1) {
                // Distributed Model (Llama 405B)
                parallelShards = 10; // Hits all 10 servers
            } else {
                // Replicated Model (TinyLlama)
                // Load Balancer: Pick a random worker
                const workers = currentState.nodes.filter(n => n.type === NodeType.WORKER);
                const randomWorker = workers[Math.floor(Math.random() * workers.length)];
                targetNodeId = randomWorker.id;
            }

            newRequests.push({
                id: reqId,
                progress: 0,
                totalTokens: 100 + Math.random() * 200,
                parallelShards,
                targetNodeId,
                color: `hsl(${Math.random() * 360}, 80%, 60%)`
            });
        }
    }

    // 2. Process Nodes & Update Requests
    
    // Filter active requests
    // Speed is determined by model characteristics
    const baseSpeed = currentModel.tokensPerSec / 60; // scaled per tick
    
    newRequests = newRequests.map(req => {
        return { ...req, progress: req.progress + baseSpeed };
    }).filter(req => req.progress < 100 + (req.totalTokens / 10)); // Keep alive for duration

    // 3. Update Node Metrics
    const activeReqs = newRequests.length;
    
    const newNodes = currentState.nodes.map(node => {
        if (node.type === NodeType.WORKER) {
            if (node.status === NodeStatus.OFFLINE) return node;
            
            // Calculate Load for this specific node
            let nodeLoad = 0;
            if (currentModel.tpSize > 1) {
                // If distributed, every active request hits this node
                nodeLoad = activeReqs;
            } else {
                // If replicated, only requests targeting this node count
                nodeLoad = newRequests.filter(r => r.targetNodeId === node.id).length;
            }

            // VRAM Logic
            // Base usage from model weights
            const baseVram = currentModel.vramPerGpu;
            // KV Cache usage increases with concurrent requests
            const kvCacheUsage = nodeLoad * (currentModel.id === 'llama-405b' ? 1.5 : 0.5); 
            
            const targetVram = Math.min(100, baseVram + kvCacheUsage);
            const newVram = node.vramUtil + (targetVram - node.vramUtil) * 0.1;

            // GPU Util Logic
            const targetUtil = Math.min(100, nodeLoad * 15);
            const newUtil = node.gpuUtil + (targetUtil - node.gpuUtil) * 0.1;

            const newTemp = 30 + (newUtil * 0.4) + (Math.random() * 1);

            return {
                ...node,
                gpuUtil: newUtil,
                vramUtil: newVram, 
                temp: newTemp,
                status: newUtil > 2 ? NodeStatus.COMPUTING : NodeStatus.IDLE,
                activeTokens: nodeLoad > 0 ? Math.floor(newUtil * (currentModel.id === 'llama-405b' ? 0.2 : 5)) : 0
            };
        } else {
            // Head Node
            return {
                ...node,
                gpuUtil: Math.min(80, activeReqs * 1), // Orchestration overhead
                status: activeReqs > 0 ? NodeStatus.COMPUTING : NodeStatus.IDLE
            };
        }
    });

    // 4. Record Metrics
    // Total throughput of the SYSTEM (generated tokens per sec)
    // For distributed, all nodes work on SAME tokens, so we don't sum them all blindly.
    // We sum finished progress of requests.
    const throughputFactor = currentModel.id === 'llama-405b' ? 1 : 10; // 405b is 1 stream, Tiny is 10 streams
    // Simple proxy for throughput:
    const totalThroughput = newNodes
        .filter(n => n.type === NodeType.WORKER)
        .reduce((acc, n) => acc + n.activeTokens, 0);
    
    const avgLatency = activeReqs > 0 ? (currentModel.id === 'llama-405b' ? 80 : 10) + (activeReqs * 2) : 0;

    const newMetric: MetricPoint = {
        timestamp: newTime,
        totalThroughput,
        avgLatency,
        clusterUtilization: newNodes.reduce((acc, n) => acc + n.gpuUtil, 0) / (newNodes.length || 1),
        queueDepth: activeReqs
    };

    const newHistory = [...currentState.metricsHistory, newMetric].slice(-100);

    setSimulationState(prev => ({
        ...prev,
        nodes: newNodes,
        requests: newRequests,
        metricsHistory: newHistory,
        systemTime: newTime
    }));

  }, [loadLevel, tutorialStep]);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
        interval = setInterval(tick, 80);
    }
    return () => clearInterval(interval);
  }, [isRunning, tick]);


  // --- Handlers ---
  const handleAskTutor = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    const contextStr = `
      Model: ${MODELS[simulationState.activeModelId].name}.
      Requests: ${simulationState.requests.length}.
      Avg GPU Util: ${simulationState.metricsHistory.slice(-1)[0]?.clusterUtilization.toFixed(1)}%.
      VRAM Load: High due to 405B? ${simulationState.activeModelId === 'llama-405b' ? 'Yes' : 'No'}.
    `;

    const answer = await askTutor(userMsg, contextStr);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
    setIsChatLoading(false);
  };

  const switchModel = (modelId: string) => {
      setSimulationState(prev => ({
          ...prev,
          activeModelId: modelId,
          requests: [], // Clear requests on switch
          metricsHistory: [] // Clear metrics for clean view
      }));
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 pb-20">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 fixed w-full top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-ray to-vllm rounded-lg shadow-lg shadow-sky-900/20">
                <Activity size={20} className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-tight">Ray & vLLM <span className="font-light text-slate-400">Sim</span></h1>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                {Object.values(MODELS).map(model => (
                    <button
                        key={model.id}
                        onClick={() => switchModel(model.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${simulationState.activeModelId === model.id ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Database size={12} />
                        {model.name}
                    </button>
                ))}
            </div>

            <div className="w-px h-4 bg-slate-700"></div>

            <button 
                onClick={() => setTutorialStep(tutorialStep === null ? 0 : null)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all font-medium text-sm border ${tutorialStep !== null ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
            >
                <BookOpen size={14} />
                {tutorialStep !== null ? 'Exit Tutorial' : 'Tutorial Mode'}
            </button>

            <div className="w-px h-4 bg-slate-700"></div>

            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all font-medium text-sm ${isRunning ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                >
                    {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    {isRunning ? 'Pause' : 'Run'}
                </button>
                <div className="w-px h-4 bg-slate-700 mx-2"></div>
                <span className="text-xs text-slate-400 px-2">User Load:</span>
                <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5].map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setLoadLevel(lvl)}
                            disabled={tutorialStep !== null}
                            className={`w-6 h-6 rounded text-xs font-bold transition-all ${loadLevel === lvl ? 'bg-sky-600 text-white scale-110' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'} ${tutorialStep !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* Tutorial Overlay */}
      {tutorialStep !== null && (
          <div className="fixed top-20 left-0 right-0 z-40 px-6 pointer-events-none flex justify-center">
              <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 p-6 rounded-2xl shadow-2xl max-w-3xl w-full pointer-events-auto animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-start mb-4">
                      <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
                          {TUTORIAL_STEPS[tutorialStep].title}
                      </h2>
                      <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                          Step {tutorialStep + 1} / {TUTORIAL_STEPS.length}
                      </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-6 text-lg">
                      {TUTORIAL_STEPS[tutorialStep].content}
                  </p>
                  <div className="flex justify-between">
                      <button onClick={() => setTutorialStep(prev => Math.max(0, (prev || 0) - 1))} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-2 rounded hover:bg-slate-800 transition-colors">
                          <ChevronLeft size={16} /> Previous
                      </button>
                      <button onClick={() => setTutorialStep(prev => Math.min(TUTORIAL_STEPS.length - 1, (prev || 0) + 1))} className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-emerald-900/20 transition-all">
                          Next <ChevronRight size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="pt-24 px-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Visualization & Controls */}
        <div className="lg:col-span-3 space-y-6">
            
            {/* 3D Cluster Viz */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Server size={20} className="text-sky-400" />
                        Cluster Topology <span className="text-sm text-slate-500 font-normal">(10 Servers / 20 A100 GPUs)</span>
                    </h2>
                    <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded border border-slate-700 font-mono">
                        Active: {MODELS[simulationState.activeModelId].name}
                    </span>
                </div>
                <ClusterVisualization simulationState={simulationState} tutorialStep={tutorialStep} />
            </section>

            {/* Metrics Dashboard */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" />
                        Prometheus / Grafana Metrics
                    </h2>
                </div>
                <MetricsDashboard data={simulationState.metricsHistory} />
            </section>

        </div>

        {/* Right Column: Node Details & Chat */}
        <div className="space-y-6">
            
            {/* Model Info Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Model Specs</h3>
                <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Name</span>
                         <span className="text-white font-medium">{MODELS[simulationState.activeModelId].name}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Params</span>
                         <span className="text-sky-400 font-mono">{MODELS[simulationState.activeModelId].paramSize}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                         <span className="text-slate-400">Strategy</span>
                         <span className={`font-mono px-2 rounded text-xs ${simulationState.activeModelId === 'llama-405b' ? 'bg-rose-900/50 text-rose-300 border border-rose-800' : 'bg-emerald-900/50 text-emerald-300 border border-emerald-800'}`}>
                             {simulationState.activeModelId === 'llama-405b' ? 'Tensor Parallel (10 Nodes)' : 'Replication (1 Node)'}
                         </span>
                     </div>
                     <div className="mt-2 text-xs text-slate-500 leading-relaxed border-t border-slate-800 pt-2">
                         {MODELS[simulationState.activeModelId].description}
                     </div>
                </div>
            </div>

            {/* Node Inspector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl max-h-[500px] overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 sticky top-0 bg-slate-900 pb-2 z-10">Live Nodes</h3>
                <div className="space-y-2">
                    {simulationState.nodes.map(node => (
                        <div 
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${selectedNodeId === node.id ? 'bg-slate-800 border-sky-500/50 ring-1 ring-sky-500/20' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${node.status === NodeStatus.COMPUTING ? 'bg-green-400' : 'bg-slate-600'}`}></div>
                                    <span className="font-medium text-xs text-slate-300">{node.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500">{node.type === NodeType.HEAD ? 'HEAD' : 'WORKER'}</span>
                            </div>
                            
                            {node.type === NodeType.WORKER && (
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-sky-500" style={{ width: `${node.gpuUtil}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-rose-500" style={{ width: `${node.vramUtil}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Tutor Chat */}
            <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none`}>
                
                {/* Chat Window */}
                {chatOpen && (
                    <div className="pointer-events-auto w-80 md:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl mb-4 flex flex-col overflow-hidden transition-all duration-200 origin-bottom-right animate-in fade-in zoom-in-95 slide-in-from-bottom-2">
                        <div className="bg-gradient-to-r from-sky-900 to-slate-900 p-4 border-b border-slate-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                                <span className="font-bold text-white text-sm">AI Infrastructure Tutor</span>
                            </div>
                            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
                        </div>
                        
                        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-sky-600 text-white rounded-tr-none' 
                                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none p-3 text-xs italic animate-pulse">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-slate-900 border-t border-slate-800">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                    placeholder="Ask about the cluster..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAskTutor()}
                                />
                                <button 
                                    onClick={handleAskTutor}
                                    disabled={isChatLoading}
                                    className="bg-sky-600 hover:bg-sky-500 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Zap size={18} fill="currentColor" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toggle Button */}
                <button 
                    onClick={() => setChatOpen(!chatOpen)}
                    className="pointer-events-auto bg-sky-600 hover:bg-sky-500 text-white rounded-full p-4 shadow-lg shadow-sky-900/50 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                    {chatOpen ? <Zap size={24} className="fill-current" /> : <MessageCircle size={24} />}
                </button>
            </div>

        </div>

      </main>
    </div>
  );
};

export default App;
