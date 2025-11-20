

import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, NodeType, NodeStatus, LoadBalancingStrategy, MetricPoint, RequestPacket, VirtualUser, UserState, NetworkSpeed } from '../types';
import { INITIAL_NODES, MODELS, MOCK_PROMPTS, USER_NAMES, USER_AVATARS, NETWORK_CAPACITY } from '../constants';

export const useSimulation = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    nodes: INITIAL_NODES, requests: [], metricsHistory: [], systemTime: 0,
    activeModelIds: ['tiny-llama'], virtualUsers: [], activityLog: []
  });
  const [isRunning, setIsRunning] = useState(false);
  const [targetUserCount, setTargetUserCount] = useState(5);
  const [lbStrategy, setLbStrategy] = useState<LoadBalancingStrategy>(LoadBalancingStrategy.RANDOM);
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>(NetworkSpeed.IB_400G);
  
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;
  const rrIndexRef = useRef(0);

  const createVirtualUser = (idSuffix: number): VirtualUser => ({
      id: `user-${Date.now()}-${idSuffix}`,
      name: USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)],
      avatar: USER_AVATARS[Math.floor(Math.random() * USER_AVATARS.length)],
      state: UserState.IDLE, timer: Math.floor(Math.random() * 50) + 20,
      color: `hsl(${Math.random() * 360}, 80%, 65%)`, totalCost: 0
  });

  const tick = useCallback(() => {
    const state = stateRef.current;
    const newTime = state.systemTime + 1;
    const currentNetworkCap = NETWORK_CAPACITY[networkSpeed];
    
    // Calculate total static VRAM requirement from all active models
    const activeModels = state.activeModelIds.map(id => MODELS[id]);
    const baseVramUsage = activeModels.reduce((sum, m) => sum + m.vramPerGpu, 0);
    
    // 1. User Lifecycle Management (Add/Remove)
    let newUsers = [...state.virtualUsers];
    if (newUsers.length < targetUserCount) newUsers.push(...Array.from({ length: targetUserCount - newUsers.length }, (_, i) => createVirtualUser(i)));
    else if (newUsers.length > targetUserCount) newUsers = newUsers.slice(0, targetUserCount);

    // 2. User Logic & Request Generation
    let newRequests = [...state.requests];
    let newLog = [...state.activityLog];
    
    newUsers = newUsers.map(user => {
        let u = { ...user };
        if (u.state === UserState.IDLE) {
            if (--u.timer <= 0) { u.state = UserState.SENDING; u.timer = 5; }
        } else if (u.state === UserState.SENDING) {
            if (--u.timer <= 0) {
                if (state.activeModelIds.length > 0) {
                    const reqId = `req-${newTime}-${u.id}`;
                    const prompt = MOCK_PROMPTS[Math.floor(Math.random() * MOCK_PROMPTS.length)];
                    
                    // Pick a random model from active models for this request
                    const selectedModelId = state.activeModelIds[Math.floor(Math.random() * state.activeModelIds.length)];
                    const selectedModel = MODELS[selectedModelId];

                    newLog.unshift({ id: `log-${newTime}-${u.id}`, timestamp: newTime, userId: u.id, userName: u.name, userAvatar: u.avatar, userColor: u.color, type: 'PROMPT', text: prompt.text });

                    let targetNodeId;
                    const workers = state.nodes.filter(n => n.type === NodeType.WORKER);
                    if (selectedModel.tpSize === 1) {
                        if (lbStrategy === LoadBalancingStrategy.ROUND_ROBIN) {
                            targetNodeId = workers[(rrIndexRef.current = (rrIndexRef.current + 1) % workers.length)].id;
                        } else if (lbStrategy === LoadBalancingStrategy.LEAST_CONNECTIONS) {
                            const counts = workers.map(w => ({ id: w.id, c: newRequests.filter(r => r.targetNodeId === w.id).length }));
                            targetNodeId = counts.sort((a, b) => a.c - b.c)[0].id;
                        } else targetNodeId = workers[Math.floor(Math.random() * workers.length)].id;
                    }
                    newRequests.push({ 
                        id: reqId, 
                        modelId: selectedModelId,
                        progress: 0, 
                        totalTokens: prompt.tokens, 
                        parallelShards: selectedModel.tpSize, 
                        targetNodeId, 
                        color: u.color 
                    });
                    u.state = UserState.WAITING; u.currentRequestId = reqId;
                } else {
                     u.state = UserState.IDLE; u.timer = 20; // No models active, wait
                }
            }
        } else if (u.state === UserState.READING) {
            if (--u.timer <= 0) { u.state = UserState.IDLE; u.timer = Math.floor(Math.random() * 50) + 20; }
        }
        return u;
    });

    // 3. Determine Network & NVLink Bottlenecks
    // Calculate aggregate demand per node first to determine global throttle
    const workerNodes = state.nodes.filter(n => n.type === NodeType.WORKER);
    let nodeBandwidthDemands: Record<string, number> = {};
    let nodeNvLinkDemands: Record<string, number> = {};
    let maxNetworkDemand = 0;

    workerNodes.forEach(node => {
        const relevantRequests = newRequests.filter(r => r.parallelShards > 1 || r.targetNodeId === node.id);
        let netDemand = 0;
        let nvLinkDemand = 0;
        
        if (relevantRequests.length > 0) {
             const hasDistributed = relevantRequests.some(r => MODELS[r.modelId].tpSize > 1);
             // Check if any active model on this node is "Large" (>30B) implying dual-GPU usage on single node
             const hasLargeSingleNode = relevantRequests.some(r => {
                 const m = MODELS[r.modelId];
                 return m.tpSize === 1 && m.vramPerGpu > 25; // Heuristic: >25% VRAM per node likely engages 2 GPUs
             });

             if (hasDistributed) {
                 // Distributed models demand HIGH Network bandwidth (AllReduce across nodes)
                 netDemand = relevantRequests.length * 5.0; 
                 // Distributed also demands VERY HIGH NVLink bandwidth (AllReduce within node first)
                 nvLinkDemand = relevantRequests.length * 150.0; // NVLink is ~600GB/s
             } else if (hasLargeSingleNode) {
                 // Large single node model (e.g. Llama 70B) uses NVLink heavily between the 2 GPUs
                 netDemand = relevantRequests.length * 0.1; // Minimal network
                 nvLinkDemand = relevantRequests.length * 100.0; // High NVLink
             } else {
                 // Small model (TinyLlama), likely runs on 1 GPU or low comms
                 netDemand = relevantRequests.length * 0.01;
                 nvLinkDemand = relevantRequests.length * 5.0;
             }
        }
        nodeBandwidthDemands[node.id] = netDemand;
        nodeNvLinkDemands[node.id] = nvLinkDemand;
        if (netDemand > maxNetworkDemand) maxNetworkDemand = netDemand;
    });

    // Global throttle factor if any node exceeds network capacity
    // 1.0 = No throttle, < 1.0 = Slow down
    const throttleFactor = maxNetworkDemand > currentNetworkCap.bandwidth 
        ? currentNetworkCap.bandwidth / maxNetworkDemand 
        : 1.0;

    // 4. Process Requests (with throttling)
    const finished = new Map();
    newRequests = newRequests.map(r => {
        const m = MODELS[r.modelId];
        // Apply throttle factor to speed
        const baseSpeed = ((m?.tokensPerSec || 100) / 60) * throttleFactor;
        
        const p = r.progress + baseSpeed;
        if (p >= 100) finished.set(r.id, r);
        return { ...r, progress: p };
    }).filter(r => r.progress < 100);

    // 5. Handle Finished Requests
    newUsers = newUsers.map(u => {
        if (u.state === UserState.WAITING && u.currentRequestId && finished.has(u.currentRequestId)) {
            const req = finished.get(u.currentRequestId);
            const model = MODELS[req.modelId];
            const cost = (req.totalTokens / 1000) * (model?.costPer1kTokens || 0);
            newLog.unshift({ id: `log-resp-${newTime}-${u.id}`, timestamp: newTime, userId: u.id, userName: u.name, userAvatar: u.avatar, userColor: u.color, type: 'RESPONSE', text: "Generated response...", latency: 100 + Math.random() * 100 });
            return { ...u, state: UserState.READING, currentRequestId: undefined, timer: 40, totalCost: u.totalCost + cost };
        }
        return u;
    });

    // 6. Update Node Stats
    const activeReqs = newRequests.length;
    let totalClusterBandwidth = 0;
    let totalClusterNvLink = 0;

    const newNodes = state.nodes.map(node => {
        if (node.type === NodeType.HEAD) return { ...node, gpuUtil: Math.min(80, activeReqs), status: activeReqs > 0 ? NodeStatus.COMPUTING : NodeStatus.IDLE };
        
        const relevantRequests = newRequests.filter(r => r.parallelShards > 1 || r.targetNodeId === node.id);
        const load = relevantRequests.length;
        
        // Compute Utilization
        const util = node.gpuUtil + (Math.min(100, load * 15) - node.gpuUtil) * 0.1;
        
        // VRAM
        let targetVram = baseVramUsage;
        const dynamicOverhead = relevantRequests.reduce((sum, r) => {
             const m = MODELS[r.modelId];
             const extra = m.id === 'llama-405b' ? 1.5 : 0.5;
             return sum + extra;
        }, 0);
        targetVram += dynamicOverhead;
        
        // Network & NVLink stats
        const netDemand = nodeBandwidthDemands[node.id] || 0;
        const nvLinkDemand = nodeNvLinkDemands[node.id] || 0;
        
        // Show actual throughput (capped by limit)
        const actualBandwidth = Math.min(netDemand, currentNetworkCap.bandwidth);
        totalClusterBandwidth += actualBandwidth;
        totalClusterNvLink += nvLinkDemand;

        // Network Utilization % relative to SELECTED capacity
        const currentNetUtil = Math.min(100, (netDemand / currentNetworkCap.bandwidth) * 100);

        return { 
            ...node, 
            gpuUtil: util, 
            vramUtil: node.vramUtil + (Math.min(100, targetVram) - node.vramUtil) * 0.1,
            netUtil: node.netUtil + (currentNetUtil - node.netUtil) * 0.2, 
            temp: 30 + util * 0.4 + Math.random(), 
            status: util > 2 ? NodeStatus.COMPUTING : NodeStatus.IDLE, 
            activeTokens: load > 0 ? Math.floor(util * 5 * throttleFactor) : 0
        };
    });

    // 7. Metrics
    const throughput = newNodes.reduce((acc, n) => acc + (n.type === NodeType.WORKER ? n.activeTokens : 0), 0);
    const costPerTick = newRequests.reduce((acc, r) => acc + ((MODELS[r.modelId]?.tokensPerSec || 0) / 1000 * (MODELS[r.modelId]?.costPer1kTokens || 0) / 60), 0);

    const newMetric: MetricPoint = {
        timestamp: newTime, 
        totalThroughput: throughput, 
        avgLatency: activeReqs > 0 ? (20 + activeReqs) / throttleFactor : 0, // Latency spikes if throttled
        clusterUtilization: newNodes.reduce((acc, n) => acc + n.gpuUtil, 0) / newNodes.length,
        totalBandwidth: totalClusterBandwidth,
        totalNvLinkBandwidth: totalClusterNvLink,
        networkLimit: currentNetworkCap.bandwidth * 10, // Total capacity across 10 nodes roughly
        queueDepth: activeReqs, 
        activeUsers: newUsers.length, 
        estimatedCostPerHour: costPerTick * 3600, 
        avgGpuTemp: newNodes.reduce((acc, n) => acc + n.temp, 0) / newNodes.length,
        nodeActiveTokens: Object.fromEntries(newNodes.map(n => [n.id, n.activeTokens])),
        nodeGpuUtil: Object.fromEntries(newNodes.map(n => [n.id, n.gpuUtil])),
        nodeVramUtil: Object.fromEntries(newNodes.map(n => [n.id, n.vramUtil])),
        nodeTemp: Object.fromEntries(newNodes.map(n => [n.id, n.temp])),
    };

    setSimulationState(prev => ({
        ...prev, nodes: newNodes, requests: newRequests, metricsHistory: [...prev.metricsHistory, newMetric].slice(-300),
        systemTime: newTime, virtualUsers: newUsers, activityLog: newLog.slice(0, 20)
    }));
  }, [targetUserCount, lbStrategy, networkSpeed]);

  useEffect(() => {
    let i: any;
    if (isRunning) i = setInterval(tick, 80);
    return () => clearInterval(i);
  }, [isRunning, tick]);

  return { 
    simulationState, setSimulationState, isRunning, setIsRunning, 
    targetUserCount, setTargetUserCount, lbStrategy, setLbStrategy,
    networkSpeed, setNetworkSpeed
  };
};