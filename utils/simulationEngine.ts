import { SimulationState, NodeType, NodeStatus, LoadBalancingStrategy, MetricPoint, UserState, VirtualUser, NetworkSpeed } from '../types';
import { NETWORK_CAPACITY, MODELS, MOCK_PROMPTS, USER_NAMES, USER_AVATARS } from '../constants';

export const createVirtualUser = (idSuffix: number): VirtualUser => ({
  id: `user-${Date.now()}-${idSuffix}`,
  name: USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)],
  avatar: USER_AVATARS[Math.floor(Math.random() * USER_AVATARS.length)],
  state: UserState.IDLE, timer: Math.floor(Math.random() * 50) + 20,
  color: `hsl(${Math.random() * 360}, 80%, 65%)`, totalCost: 0
});

export const calculateNextTick = (
    state: SimulationState, 
    targetUserCount: number, 
    lbStrategy: LoadBalancingStrategy,
    networkSpeed: NetworkSpeed,
    rrIndex: number
): { newState: SimulationState, newRrIndex: number } => {
    const TICKS_PER_SEC = 12.5; // 80ms interval
    const newTime = state.systemTime + 1;
    const currentNetworkCap = NETWORK_CAPACITY[networkSpeed];
    const activeModels = state.activeModelIds.map(id => MODELS[id]);
    const baseVramUsage = activeModels.reduce((sum, m) => sum + m.vramPerGpu, 0);
    
    let newUsers = [...state.virtualUsers];
    if (newUsers.length < targetUserCount) newUsers.push(...Array.from({ length: targetUserCount - newUsers.length }, (_, i) => createVirtualUser(i)));
    else if (newUsers.length > targetUserCount) newUsers = newUsers.slice(0, targetUserCount);

    let newRequests = [...state.requests];
    let newLog = [...state.activityLog];
    
    newUsers = newUsers.map(user => {
        let u = { ...user };
        if (u.state === UserState.IDLE && --u.timer <= 0) { u.state = UserState.SENDING; u.timer = 5; }
        else if (u.state === UserState.SENDING && --u.timer <= 0) {
            if (state.activeModelIds.length > 0) {
                const reqId = `req-${newTime}-${u.id}`;
                const prompt = MOCK_PROMPTS[Math.floor(Math.random() * MOCK_PROMPTS.length)];
                const selectedModelId = state.activeModelIds[Math.floor(Math.random() * state.activeModelIds.length)];
                const selectedModel = MODELS[selectedModelId];

                newLog.unshift({ id: `log-${newTime}-${u.id}`, timestamp: newTime, userId: u.id, userName: u.name, userAvatar: u.avatar, userColor: u.color, type: 'PROMPT', text: prompt.text });

                let targetNodeId;
                const workers = state.nodes.filter(n => n.type === NodeType.WORKER);
                if (selectedModel.tpSize === 1) {
                    if (lbStrategy === LoadBalancingStrategy.ROUND_ROBIN) targetNodeId = workers[(rrIndex = (rrIndex + 1) % workers.length)].id;
                    else if (lbStrategy === LoadBalancingStrategy.LEAST_CONNECTIONS) {
                        const counts = workers.map(w => ({ id: w.id, c: newRequests.filter(r => r.targetNodeId === w.id).length }));
                        targetNodeId = counts.sort((a, b) => a.c - b.c)[0].id;
                    } else targetNodeId = workers[Math.floor(Math.random() * workers.length)].id;
                }
                newRequests.push({ id: reqId, modelId: selectedModelId, progress: 0, totalTokens: prompt.tokens, parallelShards: selectedModel.tpSize, targetNodeId, color: u.color });
                u.state = UserState.WAITING; u.currentRequestId = reqId;
            } else { u.state = UserState.IDLE; u.timer = 20; }
        } else if (u.state === UserState.READING && --u.timer <= 0) { u.state = UserState.IDLE; u.timer = Math.floor(Math.random() * 50) + 20; }
        return u;
    });

    // Bandwidth calculation logic
    const workerNodes = state.nodes.filter(n => n.type === NodeType.WORKER);
    let nodeBandwidthDemands: Record<string, number> = {};
    let nodeNvLinkDemands: Record<string, number> = {};
    let maxNetworkDemand = 0;

    workerNodes.forEach(node => {
        const relevantRequests = newRequests.filter(r => r.parallelShards > 1 || r.targetNodeId === node.id);
        let netDemand = 0, nvLinkDemand = 0;
        if (relevantRequests.length > 0) {
             const hasDistributed = relevantRequests.some(r => MODELS[r.modelId].tpSize > 1);
             const hasLargeSingleNode = relevantRequests.some(r => { const m = MODELS[r.modelId]; return m.tpSize === 1 && m.vramPerGpu > 25; });
             if (hasDistributed) { netDemand = relevantRequests.length * 5.0; nvLinkDemand = relevantRequests.length * 150.0; }
             else if (hasLargeSingleNode) { netDemand = relevantRequests.length * 0.1; nvLinkDemand = relevantRequests.length * 100.0; }
             else { netDemand = relevantRequests.length * 0.01; nvLinkDemand = relevantRequests.length * 5.0; }
        }
        nodeBandwidthDemands[node.id] = netDemand; nodeNvLinkDemands[node.id] = nvLinkDemand;
        if (netDemand > maxNetworkDemand) maxNetworkDemand = netDemand;
    });

    // Throttling factor (0.0 to 1.0) if demand exceeds bandwidth
    const throttleFactor = maxNetworkDemand > currentNetworkCap.bandwidth ? currentNetworkCap.bandwidth / maxNetworkDemand : 1.0;
    
    const finished = new Map();
    const completedLatencies: number[] = [];

    newRequests = newRequests.map(r => {
        const m = MODELS[r.modelId];
        
        // Latency Penalty: Distributed models suffer from high network latency due to synchronization overhead
        let latencyPenalty = 1.0;
        if (m.tpSize > 1) {
             // Sensitivity factor 0.03:
             // 400G IB (1ms) -> 1 / 1.03 = ~0.97 (Fast)
             // 100G Eth (10ms) -> 1 / 1.30 = ~0.77 (Medium)
             // 10G Eth (50ms) -> 1 / 2.50 = ~0.40 (Slow)
             latencyPenalty = 1.0 / (1 + currentNetworkCap.latency * 0.03);
        }

        // Calculate processing speed
        const tokensPerSec = m.tokensPerSec || 100;
        // Effective tokens per second considering bandwidth throttle and latency penalty
        const effectiveSpeed = tokensPerSec * throttleFactor * latencyPenalty;
        
        // Tokens processed this tick
        const tokensThisTick = effectiveSpeed / TICKS_PER_SEC;
        
        // Progress increment (percentage)
        const progressInc = (tokensThisTick / Math.max(r.totalTokens, 1)) * 100;
        
        const p = r.progress + progressInc;
        
        if (p >= 100) {
            finished.set(r.id, r);
            // Calculate latency
            const parts = r.id.split('-');
            if (parts.length >= 2) {
                const startTick = parseInt(parts[1]);
                if (!isNaN(startTick)) {
                    const latencyMs = (newTime - startTick) * (1000 / TICKS_PER_SEC);
                    completedLatencies.push(latencyMs);
                }
            }
        }
        return { ...r, progress: p };
    }).filter(r => r.progress < 100);

    newUsers = newUsers.map(u => {
        if (u.state === UserState.WAITING && u.currentRequestId && finished.has(u.currentRequestId)) {
            const req = finished.get(u.currentRequestId);
            const latency = completedLatencies.length > 0 ? completedLatencies[completedLatencies.length-1] : 100;
            newLog.unshift({ id: `log-resp-${newTime}-${u.id}`, timestamp: newTime, userId: u.id, userName: u.name, userAvatar: u.avatar, userColor: u.color, type: 'RESPONSE', text: "Generated response...", latency: latency });
            return { ...u, state: UserState.READING, currentRequestId: undefined, timer: 40, totalCost: u.totalCost + (req.totalTokens / 1000) * (MODELS[req.modelId]?.costPer1kTokens || 0) };
        }
        return u;
    });

    let currentTickModelVram: Record<string, number> = {};
    state.activeModelIds.forEach(id => currentTickModelVram[id] = 0);
    let totalClusterBandwidth = 0, totalClusterNvLink = 0;

    const newNodes = state.nodes.map(node => {
        if (node.type === NodeType.HEAD) return { ...node, gpuUtil: Math.min(80, newRequests.length), status: newRequests.length > 0 ? NodeStatus.COMPUTING : NodeStatus.IDLE };
        const relevantRequests = newRequests.filter(r => r.parallelShards > 1 || r.targetNodeId === node.id);
        const load = relevantRequests.length;
        const util = node.gpuUtil + (Math.min(100, load * 15) - node.gpuUtil) * 0.1;
        let targetVram = baseVramUsage + relevantRequests.reduce((sum, r) => sum + (MODELS[r.modelId].id === 'llama-405b' ? 1.5 : 0.5), 0);
        
        state.activeModelIds.forEach(mid => {
             const m = MODELS[mid];
             const nodeReqs = relevantRequests.filter(r => r.modelId === mid);
             currentTickModelVram[mid] = (currentTickModelVram[mid] || 0) + ((m.vramPerGpu + nodeReqs.length * (mid === 'llama-405b' ? 1.5 : 0.5)) / 100) * node.totalVram;
        });
        
        totalClusterBandwidth += Math.min(nodeBandwidthDemands[node.id] || 0, currentNetworkCap.bandwidth);
        totalClusterNvLink += nodeNvLinkDemands[node.id] || 0;
        const currentNetUtil = Math.min(100, ((nodeBandwidthDemands[node.id] || 0) / currentNetworkCap.bandwidth) * 100);

        return { 
            ...node, gpuUtil: util, vramUtil: node.vramUtil + (Math.min(100, targetVram) - node.vramUtil) * 0.1,
            netUtil: node.netUtil + (currentNetUtil - node.netUtil) * 0.2, temp: 30 + util * 0.4 + Math.random(), 
            status: util > 2 ? NodeStatus.COMPUTING : NodeStatus.IDLE, activeTokens: load > 0 ? Math.floor(util * 5 * throttleFactor) : 0
        };
    });

    const throughput = newNodes.reduce((acc, n) => acc + (n.type === NodeType.WORKER ? n.activeTokens : 0), 0);
    const costPerTick = newRequests.reduce((acc, r) => acc + ((MODELS[r.modelId]?.tokensPerSec || 0) / 1000 * (MODELS[r.modelId]?.costPer1kTokens || 0) / 60), 0);

    // Calculate accurate average latency for the metric
    let currentAvgLatency = state.metricsHistory.length > 0 ? state.metricsHistory[state.metricsHistory.length - 1].avgLatency : 0;
    if (completedLatencies.length > 0) {
        const avg = completedLatencies.reduce((a, b) => a + b, 0) / completedLatencies.length;
        currentAvgLatency = currentAvgLatency * 0.8 + avg * 0.2; // Smoothing
    } else {
        // Decay slightly towards 0 if idle, or hold if busy but no completions
        if (newRequests.length === 0) currentAvgLatency *= 0.95;
    }

    const newMetric: MetricPoint = {
        timestamp: newTime, totalThroughput: throughput, avgLatency: currentAvgLatency,
        clusterUtilization: newNodes.reduce((acc, n) => acc + n.gpuUtil, 0) / newNodes.length,
        totalBandwidth: totalClusterBandwidth, totalNvLinkBandwidth: totalClusterNvLink, networkLimit: currentNetworkCap.bandwidth * 10,
        queueDepth: newRequests.length, activeUsers: newUsers.length, estimatedCostPerHour: costPerTick * 3600, 
        avgGpuTemp: newNodes.reduce((acc, n) => acc + n.temp, 0) / newNodes.length,
        nodeActiveTokens: Object.fromEntries(newNodes.map(n => [n.id, n.activeTokens])), nodeGpuUtil: Object.fromEntries(newNodes.map(n => [n.id, n.gpuUtil])),
        nodeVramUtil: Object.fromEntries(newNodes.map(n => [n.id, n.vramUtil])), nodeNetUtil: Object.fromEntries(newNodes.map(n => [n.id, n.netUtil])),
        nodeTemp: Object.fromEntries(newNodes.map(n => [n.id, n.temp])), modelVramUsage: currentTickModelVram
    };

    return {
        newState: { ...state, nodes: newNodes, requests: newRequests, metricsHistory: [...state.metricsHistory, newMetric].slice(-300), systemTime: newTime, virtualUsers: newUsers, activityLog: newLog.slice(0, 20) },
        newRrIndex: rrIndex
    };
};