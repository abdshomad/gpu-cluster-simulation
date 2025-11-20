

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Square, Zap, Activity, Server, 
  Cpu, MessageCircle, BookOpen, ChevronRight, ChevronLeft, Database, Users, DollarSign, Terminal, CreditCard, BarChart3, Workflow
} from 'lucide-react';
import { 
  SimulationState, NodeType, NodeStatus, MetricPoint, RequestPacket,
  VirtualUser, UserState, LogEntry, LoadBalancingStrategy
} from './types';
import { INITIAL_NODES, TUTORIAL_STEPS, MODELS, USER_NAMES, USER_AVATARS, MOCK_PROMPTS } from './constants';
import ClusterVisualization from './components/ClusterVisualization';
import MetricsDashboard from './components/MetricsDashboard';
import NodeDetailsModal from './components/NodeDetailsModal';
import { askTutor } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [simulationState, setSimulationState] = useState<SimulationState>({
    nodes: INITIAL_NODES,
    requests: [],
    metricsHistory: [],
    systemTime: 0,
    activeModelId: 'tiny-llama',
    virtualUsers: [],
    activityLog: []
  });
  const [isRunning, setIsRunning] = useState(false);
  const [targetUserCount, setTargetUserCount] = useState(5); // 0 to 50
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'nodes' | 'users'>('nodes');
  const [lbStrategy, setLbStrategy] = useState<LoadBalancingStrategy>(LoadBalancingStrategy.RANDOM);
  
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
  const rrIndexRef = useRef(0); // Round Robin Index

  // --- Helper: Create User ---
  const createVirtualUser = (idSuffix: number): VirtualUser => {
      const name = USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)];
      const avatar = USER_AVATARS[Math.floor(Math.random() * USER_AVATARS.length)];
      return {
          id: `user-${Date.now()}-${idSuffix}`,
          name,
          avatar,
          state: UserState.IDLE,
          timer: Math.floor(Math.random() * 50) + 20, // Initial random delay
          color: `hsl(${Math.random() * 360}, 80%, 65%)`,
          totalCost: 0
      };
  };

  // --- Simulation Logic ---
  const tick = useCallback(() => {
    const currentState = stateRef.current;
    const newTime = currentState.systemTime + 1;
    const currentModel = MODELS[currentState.activeModelId];

    // Tutorial overrides for user count
    let effectiveUserCount = targetUserCount;
    if (tutorialStep !== null) {
        if (tutorialStep === 0) effectiveUserCount = 0; 
        if (tutorialStep === 1) effectiveUserCount = 5; 
        if (tutorialStep === 2) effectiveUserCount = 25; 
        if (tutorialStep === 3) effectiveUserCount = 40; 
    }

    // 1. Manage Virtual Users (Add/Remove to match target)
    let newUsers = [...currentState.virtualUsers];
    if (newUsers.length < effectiveUserCount) {
        // Add users
        const diff = effectiveUserCount - newUsers.length;
        for (let i = 0; i < diff; i++) {
            newUsers.push(createVirtualUser(i));
        }
    } else if (newUsers.length > effectiveUserCount) {
        // Remove idle users first, or random if needed
        const excess = newUsers.length - effectiveUserCount;
        let removedCount = 0;
        newUsers = newUsers.filter(u => {
            if (removedCount < excess && u.state === UserState.IDLE) {
                removedCount++;
                return false;
            }
            return true;
        });
        // Force remove if still too many (might cut active requests, but ok for sim)
        if (newUsers.length > effectiveUserCount) {
            newUsers = newUsers.slice(0, effectiveUserCount);
        }
    }

    // 2. Process Users & Generate Requests
    let newRequests = [...currentState.requests];
    let newLog = [...currentState.activityLog];
    
    newUsers = newUsers.map(user => {
        let updatedUser = { ...user };
        
        if (user.state === UserState.IDLE) {
            updatedUser.timer -= 1;
            if (updatedUser.timer <= 0) {
                // Transition to SENDING
                updatedUser.state = UserState.SENDING;
                updatedUser.timer = 5; // Simulated typing time
            }
        } else if (user.state === UserState.SENDING) {
            updatedUser.timer -= 1;
            if (updatedUser.timer <= 0) {
                // Send Request
                const reqId = `req-${newTime}-${user.id}`;
                const prompt = MOCK_PROMPTS[Math.floor(Math.random() * MOCK_PROMPTS.length)];
                
                // Log Prompt
                newLog.unshift({
                    id: `log-${newTime}-${user.id}`,
                    timestamp: newTime,
                    userId: user.id,
                    userName: user.name,
                    userAvatar: user.avatar,
                    userColor: user.color,
                    type: 'PROMPT',
                    text: prompt.text
                });

                // Create Packet
                let parallelShards = 1;
                let targetNodeId = undefined;

                if (currentModel.tpSize > 1) {
                    parallelShards = 10; 
                    // For distributed models, it hits all nodes, so targetNodeId is undefined/irrelevant for routing
                } else {
                    const workers = currentState.nodes.filter(n => n.type === NodeType.WORKER);
                    
                    if (lbStrategy === LoadBalancingStrategy.ROUND_ROBIN) {
                        // Round Robin
                        const nextIndex = (rrIndexRef.current + 1) % workers.length;
                        rrIndexRef.current = nextIndex;
                        targetNodeId = workers[nextIndex].id;

                    } else if (lbStrategy === LoadBalancingStrategy.LEAST_CONNECTIONS) {
                        // Least Connections: Find worker with fewest active requests
                        const nodeLoads = new Map<string, number>();
                        workers.forEach(w => nodeLoads.set(w.id, 0));
                        
                        // Count current active requests
                        newRequests.forEach(r => {
                            if (r.targetNodeId) {
                                nodeLoads.set(r.targetNodeId, (nodeLoads.get(r.targetNodeId) || 0) + 1);
                            }
                        });
                        
                        // Find min
                        let minLoad = Infinity;
                        let bestNode = workers[0];
                        
                        workers.forEach(w => {
                            const load = nodeLoads.get(w.id) || 0;
                            if (load < minLoad) {
                                minLoad = load;
                                bestNode = w;
                            }
                        });
                        targetNodeId = bestNode.id;

                    } else {
                        // Random (Default)
                        const randomWorker = workers[Math.floor(Math.random() * workers.length)];
                        targetNodeId = randomWorker.id;
                    }
                }

                newRequests.push({
                    id: reqId,
                    progress: 0,
                    totalTokens: prompt.tokens,
                    parallelShards,
                    targetNodeId,
                    color: user.color
                });

                updatedUser.state = UserState.WAITING;
                updatedUser.currentRequestId = reqId;
            }
        } else if (user.state === UserState.WAITING) {
            // Check if request is done. 
        } else if (user.state === UserState.READING) {
            updatedUser.timer -= 1;
            if (updatedUser.timer <= 0) {
                updatedUser.state = UserState.IDLE;
                updatedUser.timer = Math.floor(Math.random() * 50) + 20;
            }
        }
        return updatedUser;
    });

    // 3. Process Requests
    const baseSpeed = currentModel.tokensPerSec / 60; // scaled per tick
    const finishedRequestsMap = new Map<string, RequestPacket>(); // ID -> Request
    
    // Move requests
    newRequests = newRequests.map(req => {
        const newProgress = req.progress + baseSpeed;
        if (newProgress >= 100) {
            finishedRequestsMap.set(req.id, req);
        }
        return { ...req, progress: newProgress };
    }).filter(req => req.progress < 100); // Remove completed from active list

    // 4. Update Users who finished WAITING
    newUsers = newUsers.map(user => {
        if (user.state === UserState.WAITING && user.currentRequestId && finishedRequestsMap.has(user.currentRequestId)) {
            // Request Finished
            const completedReq = finishedRequestsMap.get(user.currentRequestId)!;
            
            // Calculate Cost
            // Cost = (Total Tokens / 1000) * CostPer1k
            const reqCost = (completedReq.totalTokens / 1000) * currentModel.costPer1kTokens;
            const newTotalCost = user.totalCost + reqCost;

            // Log Response
            newLog.unshift({
                id: `log-resp-${newTime}-${user.id}`,
                timestamp: newTime,
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar,
                userColor: user.color,
                type: 'RESPONSE',
                text: "Generated response...", // Placeholder
                latency: 120 + Math.random() * 50 // Mock latency
            });

            return {
                ...user,
                state: UserState.READING,
                currentRequestId: undefined,
                timer: 40, // Reading time
                totalCost: newTotalCost
            };
        }
        return user;
    });

    // Trim Log
    if (newLog.length > 20) newLog = newLog.slice(0, 20);

    // 5. Update Node Metrics
    const activeReqs = newRequests.length;
    
    const newNodes = currentState.nodes.map(node => {
        if (node.type === NodeType.WORKER) {
            if (node.status === NodeStatus.OFFLINE) return node;
            
            // Calculate Load for this specific node
            let nodeLoad = 0;
            if (currentModel.tpSize > 1) {
                nodeLoad = activeReqs;
            } else {
                nodeLoad = newRequests.filter(r => r.targetNodeId === node.id).length;
            }

            // VRAM & Util
            const baseVram = currentModel.vramPerGpu;
            const kvCacheUsage = nodeLoad * (currentModel.id === 'llama-405b' ? 1.5 : 0.5); 
            const targetVram = Math.min(100, baseVram + kvCacheUsage);
            const newVram = node.vramUtil + (targetVram - node.vramUtil) * 0.1;

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
                gpuUtil: Math.min(80, activeReqs * 1), 
                status: activeReqs > 0 ? NodeStatus.COMPUTING : NodeStatus.IDLE
            };
        }
    });

    // 6. Record Metrics
    const totalThroughput = newNodes
        .filter(n => n.type === NodeType.WORKER)
        .reduce((acc, n) => acc + n.activeTokens, 0);
    
    const avgLatency = activeReqs > 0 ? (currentModel.id === 'llama-405b' ? 80 : 10) + (activeReqs * 2) : 0;
    
    // Estimate Cost (Mock: $ per 1M tokens equivalent)
    // Cost = Throughput * CostPerToken
    const costPerSec = (totalThroughput / 1000) * currentModel.costPer1kTokens;
    const costPerHour = costPerSec * 3600;

    // Calculate Avg GPU Temp and Active Tokens distribution
    const workerNodes = newNodes.filter(n => n.type === NodeType.WORKER);
    
    const avgGpuTemp = workerNodes.length > 0 
        ? workerNodes.reduce((acc, n) => acc + n.temp, 0) / workerNodes.length 
        : 30;
    
    // Collect per-node metrics for history
    const nodeActiveTokens: Record<string, number> = {};
    const nodeGpuUtil: Record<string, number> = {};
    const nodeVramUtil: Record<string, number> = {};
    const nodeTemp: Record<string, number> = {};

    workerNodes.forEach(n => {
        nodeActiveTokens[n.id] = n.activeTokens;
        nodeGpuUtil[n.id] = n.gpuUtil;
        nodeVramUtil[n.id] = n.vramUtil;
        nodeTemp[n.id] = n.temp;
    });

    const newMetric: MetricPoint = {
        timestamp: newTime,
        totalThroughput,
        avgLatency,
        clusterUtilization: newNodes.reduce((acc, n) => acc + n.gpuUtil, 0) / (newNodes.length || 1),
        queueDepth: activeReqs,
        activeUsers: effectiveUserCount,
        estimatedCostPerHour: costPerHour,
        avgGpuTemp,
        nodeActiveTokens,
        nodeGpuUtil,
        nodeVramUtil,
        nodeTemp
    };

    // Buffer size 300 for better trend visualization
    const newHistory = [...currentState.metricsHistory, newMetric].slice(-300);

    setSimulationState(prev => ({
        ...prev,
        nodes: newNodes,
        requests: newRequests,
        metricsHistory: newHistory,
        systemTime: newTime,
        virtualUsers: newUsers,
        activityLog: newLog
    }));

  }, [targetUserCount, tutorialStep, lbStrategy]);

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
      Active Users: ${simulationState.virtualUsers.length}.
      Throughput: ${simulationState.metricsHistory.slice(-1)[0]?.totalThroughput.toFixed(0)} tok/s.
      Estimated Cost: $${simulationState.metricsHistory.slice(-1)[0]?.estimatedCostPerHour.toFixed(2)}/hr.
    `;

    const answer = await askTutor(userMsg, contextStr);
    
    setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
    setIsChatLoading(false);
  };

  const switchModel = (modelId: string) => {
      setSimulationState(prev => ({
          ...prev,
          activeModelId: modelId,
          requests: [], 
          metricsHistory: [],
          activityLog: [],
          // Keep users, but they might reset states on next tick logic due to cleared requests
      }));
  };

  // Find selected node for modal
  const selectedNode = simulationState.nodes.find(n => n.id === selectedNodeId);

  // Check if LB selector should be disabled (e.g. for distributed models which use all nodes)
  const isDistributedModel = MODELS[simulationState.activeModelId].tpSize > 1;

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
            {/* Model Selector */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 hidden md:flex">
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

            {/* LB Strategy Selector */}
            <div className={`hidden lg:flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700 ${isDistributedModel ? 'opacity-50 pointer-events-none' : ''}`} title={isDistributedModel ? "Load Balancing N/A for Distributed Models" : "Select Load Balancing Strategy"}>
                <div className="px-2 flex items-center gap-1 text-slate-500">
                    <Workflow size={12} />
                    <span className="text-[10px] font-bold uppercase">LB</span>
                </div>
                 <select 
                    value={lbStrategy} 
                    onChange={(e) => setLbStrategy(e.target.value as LoadBalancingStrategy)}
                    disabled={isDistributedModel}
                    className="bg-transparent text-xs font-medium text-slate-300 focus:outline-none cursor-pointer py-1 pr-2"
                 >
                    <option value={LoadBalancingStrategy.RANDOM}>Random</option>
                    <option value={LoadBalancingStrategy.ROUND_ROBIN}>Round Robin</option>
                    <option value={LoadBalancingStrategy.LEAST_CONNECTIONS}>Least Conn.</option>
                 </select>
            </div>

            <div className="w-px h-4 bg-slate-700 hidden md:block"></div>

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
                    <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Simulate'}</span>
                </button>
                <div className="w-px h-4 bg-slate-700 mx-2"></div>
                
                <div className="flex items-center gap-2 px-2">
                    <Users size={14} className="text-slate-400" />
                    <input 
                        type="range" 
                        min="0" 
                        max="50" 
                        step="5"
                        value={targetUserCount}
                        onChange={(e) => setTargetUserCount(parseInt(e.target.value))}
                        disabled={tutorialStep !== null}
                        className="w-24 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <span className="text-xs font-mono w-6 text-right text-sky-400">{targetUserCount}</span>
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

      {/* Node Details Modal */}
      {selectedNode && (
        <NodeDetailsModal 
            node={selectedNode} 
            metricsHistory={simulationState.metricsHistory}
            onClose={() => setSelectedNodeId(null)}
        />
      )}

      {/* Main Content */}
      <main className="pt-24 px-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualization & Metrics (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
            
            {/* 3D Cluster Viz */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Server size={20} className="text-sky-400" />
                        Cluster Topology <span className="text-sm text-slate-500 font-normal hidden sm:inline">(10 Servers / 20 A100 GPUs)</span>
                    </h2>
                    <div className="flex gap-3">
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 uppercase">Active Model</span>
                            <span className="text-xs font-bold text-sky-400">{MODELS[simulationState.activeModelId].name}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 uppercase">Est. Cost</span>
                            <span className="text-xs font-bold text-emerald-400">
                                ${simulationState.metricsHistory.slice(-1)[0]?.estimatedCostPerHour.toFixed(2) || '0.00'}/hr
                            </span>
                         </div>
                    </div>
                </div>
                <ClusterVisualization simulationState={simulationState} tutorialStep={tutorialStep} />
            </section>

            {/* Metrics Dashboard */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" />
                        Prometheus Metrics
                    </h2>
                </div>
                <MetricsDashboard data={simulationState.metricsHistory} />
            </section>

        </div>

        {/* Right Column: Details & Logs (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Live Activity Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col shadow-xl h-[400px]">
                 <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 rounded-t-xl backdrop-blur">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                         <Terminal size={14} /> Live Traffic
                     </h3>
                     <div className="flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                         <span className="text-xs text-green-500 font-mono">{simulationState.virtualUsers.length} Active Users</span>
                     </div>
                 </div>
                 <div className="flex-grow p-4 space-y-3 bg-slate-950/30">
                     {simulationState.activityLog.length === 0 && (
                         <div className="text-center text-slate-600 text-sm py-10">
                             Waiting for traffic...
                         </div>
                     )}
                     {simulationState.activityLog.map((log) => (
                         <div key={log.id} className="text-sm animate-in slide-in-from-left-2 duration-300">
                             <div className="flex items-start gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                     {log.type === 'PROMPT' ? <span className="text-base">{log.userAvatar}</span> : <Cpu size={14} className="text-sky-500" />}
                                 </div>
                                 <div className="flex-grow min-w-0">
                                     <div className="flex justify-between items-baseline mb-1">
                                         <span className="font-bold text-xs text-slate-300">
                                            {log.type === 'PROMPT' ? log.userName : 'vLLM Cluster'}
                                         </span>
                                         {log.latency && (
                                             <span className="text-[10px] font-mono text-slate-500">{log.latency.toFixed(0)}ms</span>
                                         )}
                                     </div>
                                     <p className={`text-xs leading-relaxed ${log.type === 'PROMPT' ? 'text-slate-400' : 'text-emerald-400/80'}`}>
                                         {log.type === 'PROMPT' ? `"${log.text}"` : "Generated completion tokens..."}
                                     </p>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Tabbed Panel: Node Inspector / User Billing */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden">
                <div className="flex border-b border-slate-800">
                    <button 
                        onClick={() => setRightPanelTab('nodes')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${rightPanelTab === 'nodes' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <Server size={14} /> Node Status
                    </button>
                    <button 
                        onClick={() => setRightPanelTab('users')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${rightPanelTab === 'users' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                        <CreditCard size={14} /> User Billing
                    </button>
                </div>

                <div className="p-4 bg-slate-950/30">
                    {rightPanelTab === 'nodes' ? (
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
                                        <div className="mt-2 grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex justify-between items-center text-[10px] mb-1">
                                                    <span className="font-bold text-slate-500">GPU</span>
                                                    <span className={`font-mono ${node.gpuUtil > 90 ? 'text-red-400' : 'text-sky-400'}`}>{node.gpuUtil.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-300 ${node.gpuUtil > 90 ? 'bg-red-500' : 'bg-sky-500'}`} 
                                                        style={{ width: `${node.gpuUtil}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center text-[10px] mb-1">
                                                    <span className="font-bold text-slate-500">VRAM</span>
                                                    <span className={`font-mono ${node.vramUtil > 90 ? 'text-red-400' : 'text-rose-400'}`}>{node.vramUtil.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-300 ${node.vramUtil > 90 ? 'bg-red-500' : 'bg-rose-500'}`} 
                                                        style={{ width: `${node.vramUtil}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                             <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-slate-500 border-b border-slate-800">
                                        <th className="pb-2 font-medium uppercase text-[10px]">User</th>
                                        <th className="pb-2 font-medium uppercase text-[10px]">Status</th>
                                        <th className="pb-2 text-right font-medium uppercase text-[10px]">Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {simulationState.virtualUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-slate-600">No active users</td>
                                        </tr>
                                    )}
                                    {[...simulationState.virtualUsers].sort((a,b) => b.totalCost - a.totalCost).map(user => (
                                        <tr key={user.id} className="border-b border-slate-800/50 last:border-0 group hover:bg-slate-800/30 transition-colors">
                                            <td className="py-2.5 flex items-center gap-2">
                                                <span className="text-base">{user.avatar}</span>
                                                <span className="font-medium text-slate-300 group-hover:text-white">{user.name}</span>
                                            </td>
                                            <td className="py-2.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                                                    user.state === UserState.WAITING ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    user.state === UserState.SENDING ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                                                    'bg-slate-700/30 text-slate-400 border-slate-700'
                                                }`}>
                                                    {user.state}
                                                </span>
                                            </td>
                                            <td className="py-2.5 text-right font-mono text-emerald-400">
                                                ${user.totalCost.toFixed(5)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Tutor Chat Button */}
            <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none`}>
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