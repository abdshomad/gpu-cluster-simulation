import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Square, Plus, Zap, Activity, Server, 
  Cpu, Thermometer, Info, MessageCircle 
} from 'lucide-react';
import { 
  SimulationState, NodeType, NodeStatus, RequestPacket, MetricPoint 
} from './types';
import { INITIAL_NODES } from './constants';
import ClusterVisualization from './components/ClusterVisualization';
import MetricsDashboard from './components/MetricsDashboard';
import { askTutor } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [simulationState, setSimulationState] = useState<SimulationState>({
    nodes: INITIAL_NODES,
    requests: [],
    metricsHistory: [],
    systemTime: 0
  });
  const [isRunning, setIsRunning] = useState(false);
  const [loadLevel, setLoadLevel] = useState(0); // 0 to 5
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Tutor/Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Welcome to the GPU Cluster Sim. Ask me anything about Ray, vLLM, or Parallelism!' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- Refs for Simulation Loop ---
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;

  // --- Simulation Logic ---
  const tick = useCallback(() => {
    const currentState = stateRef.current;
    const newTime = currentState.systemTime + 1;

    // 1. Generate New Requests based on Load Level
    let newRequests = [...currentState.requests];
    if (loadLevel > 0) {
        const chance = loadLevel * 0.05; // 5% to 25% chance per tick
        if (Math.random() < chance) {
            const reqId = `req-${newTime}-${Math.floor(Math.random() * 1000)}`;
            newRequests.push({
                id: reqId,
                progress: 0,
                totalTokens: 50 + Math.random() * 200,
                parallelShards: 4, // Split across 4 workers
                color: `hsl(${Math.random() * 360}, 70%, 60%)`
            });
        }
    }

    // 2. Process Nodes & Update Requests
    const activeWorkerCount = currentState.nodes.filter(n => n.type === NodeType.WORKER && n.status !== NodeStatus.OFFLINE).length;
    
    // Map request progress
    newRequests = newRequests.map(req => {
        // Speed depends on active workers (Parallelism Effect)
        const speed = 1.5 * activeWorkerCount; 
        return { ...req, progress: req.progress + speed };
    }).filter(req => req.progress < 100 + req.totalTokens); // Keep until finished

    // 3. Update Node Metrics
    const activeReqCount = newRequests.length;
    const newNodes = currentState.nodes.map(node => {
        if (node.type === NodeType.WORKER) {
            if (node.status === NodeStatus.OFFLINE) return node;
            
            // Simulate Heat & Load
            const targetUtil = activeReqCount > 0 ? Math.min(100, 20 + activeReqCount * 10) : 0;
            const newUtil = node.gpuUtil + (targetUtil - node.gpuUtil) * 0.1;
            const newTemp = 30 + (newUtil * 0.5) + (Math.random() * 2); // Base 30 + load heat
            
            return {
                ...node,
                gpuUtil: newUtil,
                vramUtil: activeReqCount > 0 ? 60 : 0, // KV Cache usage simulation
                temp: newTemp,
                status: newUtil > 5 ? NodeStatus.COMPUTING : NodeStatus.IDLE,
                activeTokens: activeReqCount > 0 ? Math.floor(newUtil * 1.5) : 0
            };
        } else {
            // Head Node
            return {
                ...node,
                gpuUtil: activeReqCount * 2, // CPU load really
                status: activeReqCount > 0 ? NodeStatus.COMPUTING : NodeStatus.IDLE
            };
        }
    });

    // 4. Record Metrics
    const totalThroughput = newNodes
        .filter(n => n.type === NodeType.WORKER)
        .reduce((acc, n) => acc + n.activeTokens, 0);
    
    const avgLatency = activeReqCount > 0 ? 20 + (activeReqCount * 5) : 0; // Latency increases with congestion

    const newMetric: MetricPoint = {
        timestamp: newTime,
        totalThroughput,
        avgLatency,
        clusterUtilization: newNodes.reduce((acc, n) => acc + n.gpuUtil, 0) / (newNodes.length || 1),
        queueDepth: activeReqCount
    };

    const newHistory = [...currentState.metricsHistory, newMetric].slice(-50); // Keep last 50 ticks

    setSimulationState({
        nodes: newNodes,
        requests: newRequests,
        metricsHistory: newHistory,
        systemTime: newTime
    });

  }, [loadLevel]);

  useEffect(() => {
    let interval: any;
    if (isRunning) {
        interval = setInterval(tick, 100); // 10 ticks per second
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

    // Construct context for the AI
    const activeWorkers = simulationState.nodes.filter(n => n.status === NodeStatus.COMPUTING).length;
    const throughput = simulationState.metricsHistory.slice(-1)[0]?.totalThroughput || 0;
    const contextStr = `Active Workers: ${activeWorkers}. Total Throughput: ${throughput} tok/s. Load Level: ${loadLevel}/5.`;

    const answer = await askTutor(userMsg, contextStr);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
    setIsChatLoading(false);
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30">
      
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 fixed w-full top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-ray to-vllm rounded-lg shadow-lg shadow-sky-900/20">
                <Activity size={20} className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-lg tracking-tight">Ray & vLLM <span className="font-light text-slate-400">Simulator</span></h1>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all font-medium text-sm ${isRunning ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                >
                    {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    {isRunning ? 'Stop Sim' : 'Start Sim'}
                </button>
                <div className="w-px h-4 bg-slate-700 mx-2"></div>
                <span className="text-xs text-slate-400 px-2">Load Level:</span>
                <div className="flex gap-1">
                    {[0, 1, 2, 3, 4, 5].map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setLoadLevel(lvl)}
                            className={`w-6 h-6 rounded text-xs font-bold transition-all ${loadLevel === lvl ? 'bg-sky-600 text-white scale-110' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-10 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visualization & Controls */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* 3D/2D Cluster Viz */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Server size={20} className="text-sky-400" />
                        Cluster Topology
                    </h2>
                    <span className="text-xs bg-sky-900/50 text-sky-300 px-2 py-1 rounded border border-sky-800">
                        Strategy: Tensor Parallel (TP=4)
                    </span>
                </div>
                <ClusterVisualization simulationState={simulationState} />
            </section>

            {/* Metrics Dashboard */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" />
                        Prometheus Metrics
                    </h2>
                    <div className="flex gap-2">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live Scraping
                        </span>
                    </div>
                </div>
                <MetricsDashboard data={simulationState.metricsHistory} />
            </section>

        </div>

        {/* Right Column: Node Details & Chat */}
        <div className="space-y-6">
            
            {/* Node Inspector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Node Inspector</h3>
                <div className="space-y-3">
                    {simulationState.nodes.map(node => (
                        <div 
                            key={node.id}
                            onClick={() => setSelectedNodeId(node.id)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${selectedNodeId === node.id ? 'bg-slate-800 border-sky-500/50 ring-1 ring-sky-500/20' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${node.status === NodeStatus.COMPUTING ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`}></div>
                                    <span className="font-medium text-sm text-slate-200">{node.name}</span>
                                </div>
                                <span className="text-xs font-mono text-slate-500">{node.type}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-slate-950 rounded p-2 flex flex-col gap-1">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Cpu size={10} /> GPU Util
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${node.gpuUtil}%` }}></div>
                                    </div>
                                    <span className="text-xs font-mono text-right block">{node.gpuUtil.toFixed(1)}%</span>
                                </div>
                                <div className="bg-slate-950 rounded p-2 flex flex-col gap-1">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        <Thermometer size={10} /> Temp
                                    </div>
                                    <div className="text-xs font-mono text-right flex justify-between items-center h-full">
                                        <span className={`${node.temp > 80 ? 'text-red-400' : 'text-emerald-400'}`}>{node.temp.toFixed(0)}°C</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Tutor Chat */}
            <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none`}>
                
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
                                        Analyzing cluster metrics...
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-slate-900 border-t border-slate-800">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-grow bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                                    placeholder="Ask about Tensor Parallelism..."
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
