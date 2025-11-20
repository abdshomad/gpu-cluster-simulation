
import { SimulationState, NodeType, NodeStatus, LoadBalancingStrategy, MetricPoint, UserState, VirtualUser, NetworkSpeed, PlacementStrategy, RequestStage, ClusterNode } from '../types';
import { NETWORK_CAPACITY, MODELS, MOCK_PROMPTS, USER_NAMES, USER_AVATARS } from '../constants';

export const createVirtualUser = (idSuffix: number): VirtualUser => ({
  id: `user-${Date.now()}-${idSuffix}`,
  name: USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)],
  avatar: USER_AVATARS[Math.floor(Math.random() * USER_AVATARS.length)],
  state: UserState.IDLE, timer: Math.floor(Math.random() * 50) + 20,
  color: `hsl(${Math.random() * 360}, 80%, 65%)`, totalCost: 0,
  totalTokens: 0, requestCount: 0
});

export const calculateNextTick = (
    state: SimulationState, 
    targetUserCount: number, 
    lbStrategy: LoadBalancingStrategy,
    networkSpeed: NetworkSpeed,
    placementStrategy: PlacementStrategy,
    rrIndex: number
): { newState: SimulationState, newRrIndex: number } => {
    const TICKS_PER_SEC = 12.5; // 80ms interval
    const MS_PER_TICK = 80;
    const newTime = state.systemTime + 1;
    const currentNetworkCap = NETWORK_CAPACITY[networkSpeed];
    
    let newUsers = [...state.virtualUsers];
    if (newUsers.length < targetUserCount) newUsers.push(...Array.from({ length: targetUserCount - newUsers.length }, (_, i) => createVirtualUser(i)));
    else if (newUsers.length > targetUserCount) newUsers = newUsers.slice(0, targetUserCount);

    let newRequests = [...state.requests];
    let newLog = [...state.activityLog];
    
    const onlineWorkers = state.nodes.filter(n => n.type === NodeType.WORKER && n.status !== NodeStatus.OFFLINE);

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

                let targetNodeId: string | undefined;
                let targetNodeIds: string[] = [];
                let placementSuccess = false;
                
                if (onlineWorkers.length > 0) {
                    // === Placement Logic ===
                    let candidatePool: ClusterNode[] = [];
                    const rack1 = onlineWorkers.filter(n => n.rackId === 'rack-1');
                    const rack2 = onlineWorkers.filter(n => n.rackId === 'rack-2');
                    
                    if (selectedModel.tpSize === 1) {
                        // Standard Single-Node Placement
                        const rack1Util = rack1.reduce((acc, n) => acc + n.gpuUtil, 0) / (rack1.length || 1);
                        const rack2Util = rack2.reduce((acc, n) => acc + n.gpuUtil, 0) / (rack2.length || 1);

                        switch (placementStrategy) {
                            case PlacementStrategy.PACK:
                                // Prefer Rack 1, spill to Rack 2 if R1 is > 85% utilized or empty
                                if (rack1.length > 0 && rack1Util < 85) candidatePool = rack1;
                                else if (rack2.length > 0 && rack2Util < 85) candidatePool = rack2;
                                else candidatePool = onlineWorkers; // Last resort
                                break;
                            case PlacementStrategy.STRICT_PACK:
                                // Only Rack 1 allowed. Fail if full or offline.
                                if (rack1.length > 0 && rack1Util < 95) candidatePool = rack1;
                                else candidatePool = []; 
                                break;
                            case PlacementStrategy.SPREAD:
                                // Use everyone
                                candidatePool = onlineWorkers;
                                break;
                            default:
                                candidatePool = onlineWorkers;
                        }

                        if (candidatePool.length > 0) {
                            // Load Balancing within the chosen Candidate Pool
                            if (lbStrategy === LoadBalancingStrategy.ROUND_ROBIN) {
                                targetNodeId = candidatePool[(rrIndex = (rrIndex + 1) % candidatePool.length)].id;
                            } else if (lbStrategy === LoadBalancingStrategy.LEAST_CONNECTIONS) {
                                const counts = candidatePool.map(w => ({ id: w.id, c: newRequests.filter(r => r.targetNodeId === w.id).length }));
                                targetNodeId = counts.sort((a, b) => a.c - b.c)[0].id;
                            } else {
                                targetNodeId = candidatePool[Math.floor(Math.random() * candidatePool.length)].id;
                            }
                            placementSuccess = true;
                        }
                    } else {
                        // Distributed (TP) Placement Logic
                        // Strict requirement: Must find `tpSize` contiguous healthy nodes
                        if (onlineWorkers.length >= selectedModel.tpSize) {
                            // Try to fit entirely in Rack 1 (Low latency)
                            if (rack1.length >= selectedModel.tpSize) {
                                targetNodeIds = rack1.slice(0, selectedModel.tpSize).map(n => n.id);
                            } 
                            // Try to fit entirely in Rack 2
                            else if (rack2.length >= selectedModel.tpSize) {
                                targetNodeIds = rack2.slice(0, selectedModel.tpSize).map(n => n.id);
                            }
                            // Span across racks (Higher latency implied in real world, but allowed here)
                            else {
                                targetNodeIds = onlineWorkers.slice(0, selectedModel.tpSize).map(n => n.id);
                            }
                            placementSuccess = true;
                        }
                    }

                    if (!placementSuccess) {
                         newLog.unshift({ 
                             id: `log-err-${newTime}-${u.id}`, 
                             timestamp: newTime, 
                             userId: u.id, 
                             userName: "SYSTEM", 
                             userAvatar: "⚠️", 
                             userColor: "#ef4444", 
                             type: 'RESPONSE', 
                             text: selectedModel.tpSize > 1 
                                ? `Placement Failed: Insufficient healthy nodes for TP=${selectedModel.tpSize}`
                                : `Placement Failed: Strategy ${placementStrategy} rejected request (Rack full/offline).` 
                         });
                         u.state = UserState.IDLE; u.timer = 30;
                         return u; 
                    }

                    // Initialize request
                    newRequests.push({ 
                        id: reqId, 
                        modelId: selectedModelId, 
                        stage: RequestStage.TRANSFER,
                        progress: 0, 
                        promptTokens: Math.floor(prompt.tokens * 0.5) + 10, 
                        outputTokens: prompt.tokens, 
                        parallelShards: selectedModel.tpSize, 
                        targetNodeId,
                        targetNodeIds, 
                        color: u.color,
                        startTime: newTime 
                    });
                    u.state = UserState.WAITING; u.currentRequestId = reqId;
                } else {
                     newLog.unshift({ id: `log-err-${newTime}-${u.id}`, timestamp: newTime, userId: u.id, userName: "SYSTEM", userAvatar: "⚠️", userColor: "#ef4444", type: 'RESPONSE', text: "Request Failed: Cluster Offline." });
                     u.state = UserState.IDLE; u.timer = 30; 
                }
            } else { u.state = UserState.IDLE; u.timer = 20; }
        } else if (u.state === UserState.READING && --u.timer <= 0) { u.state = UserState.IDLE; u.timer = Math.floor(Math.random() * 50) + 20; }
        return u;
    });

    // Bandwidth Logic
    const workerNodes = state.nodes.filter(n => n.type === NodeType.WORKER && n.status !== NodeStatus.OFFLINE);
    let nodeBandwidthDemands: Record<string, number> = {};
    let nodeNvLinkDemands: Record<string, number> = {};
    let maxNetworkDemand = 0;

    workerNodes.forEach(node => {
        const relevantRequests = newRequests.filter(r => 
            (r.targetNodeId === node.id) || 
            (r.targetNodeIds && r.targetNodeIds.includes(node.id))
        );
        
        let netDemand = 0, nvLinkDemand = 0;
        if (relevantRequests.length > 0) {
             relevantRequests.forEach(r => {
                 const m = MODELS[r.modelId];
                 if (m.tpSize > 1) {
                     // TP involves heavy AllReduce
                     netDemand += 5.0; 
                     nvLinkDemand += 150.0; 
                 } else {
                     netDemand += 0.1; 
                     nvLinkDemand += 5.0;
                 }
             });
        }
        nodeBandwidthDemands[node.id] = netDemand; nodeNvLinkDemands[node.id] = nvLinkDemand;
        if (netDemand > maxNetworkDemand) maxNetworkDemand = netDemand;
    });

    const throttleFactor = maxNetworkDemand > currentNetworkCap.bandwidth ? currentNetworkCap.bandwidth / maxNetworkDemand : 1.0;
    
    const finished = new Map();
    const completedLatencies: number[] = [];
    const completedTtfts: number[] = [];

    newRequests = newRequests.map(r => {
        const m = MODELS[r.modelId];
        
        // Check for Offline Stalls
        let isStalled = false;
        if (m.tpSize > 1) {
             const groupNodes = state.nodes.filter(n => r.targetNodeIds?.includes(n.id));
             if (groupNodes.some(n => n.status === NodeStatus.OFFLINE)) isStalled = true;
        } else {
            const target = state.nodes.find(n => n.id === r.targetNodeId);
            if (!target || target.status === NodeStatus.OFFLINE) isStalled = true;
        }
        if (isStalled) return r;

        let newStage = r.stage;
        let newProgress = r.progress;
        let newTtft = r.ttft;

        if (r.stage === RequestStage.TRANSFER) {
            const latencyFactor = currentNetworkCap.latency; 
            const speed = 20 / Math.max(1, Math.log2(latencyFactor)); 
            newProgress += speed;
            if (newProgress >= 100) {
                newStage = RequestStage.PREFILL;
                newProgress = 0;
            }
        } else if (r.stage === RequestStage.PREFILL) {
            const prefillSpeed = (m.tokensPerSec * 20) * throttleFactor; 
            const tokensProcessed = prefillSpeed / TICKS_PER_SEC;
            const increment = (tokensProcessed / r.promptTokens) * 100;
            newProgress += increment;
            
            if (newProgress >= 100) {
                newStage = RequestStage.DECODE;
                newProgress = 0;
                newTtft = (newTime - r.startTime) * MS_PER_TICK;
                completedTtfts.push(newTtft);
            }
        } else if (r.stage === RequestStage.DECODE) {
            const decodeSpeed = m.tokensPerSec * throttleFactor;
            const tokensProcessed = decodeSpeed / TICKS_PER_SEC;
            const increment = (tokensProcessed / r.outputTokens) * 100;
            newProgress += increment;
            
            if (newProgress >= 100) {
                finished.set(r.id, r);
                const totalTime = (newTime - r.startTime) * MS_PER_TICK;
                completedLatencies.push(totalTime);
            }
        }

        return { ...r, stage: newStage, progress: newProgress, ttft: newTtft };
    }).filter(r => !finished.has(r.id));

    // Update Users (Billing & State)
    newUsers = newUsers.map(u => {
        if (u.state === UserState.WAITING && u.currentRequestId && finished.has(u.currentRequestId)) {
            const req = finished.get(u.currentRequestId);
            const latency = completedLatencies.length > 0 ? completedLatencies[completedLatencies.length-1] : 0;
            const ttft = req.ttft || 0;
            
            newLog.unshift({ 
                id: `log-resp-${newTime}-${u.id}`, 
                timestamp: newTime, 
                userId: u.id, 
                userName: u.name, 
                userAvatar: u.avatar, 
                userColor: u.color, 
                type: 'RESPONSE', 
                text: "Response received", 
                latency,
                ttft 
            });
            
            // Billing Calculation
            const cost = ((req.promptTokens + req.outputTokens) / 1000) * (MODELS[req.modelId]?.costPer1kTokens || 0);

            return { 
                ...u, 
                state: UserState.READING, 
                currentRequestId: undefined, 
                timer: 40, 
                totalCost: u.totalCost + cost,
                totalTokens: u.totalTokens + req.promptTokens + req.outputTokens,
                requestCount: u.requestCount + 1
            };
        }
        return u;
    });

    // Node Utilization Logic
    let currentTickModelVram: Record<string, number> = {};
    state.activeModelIds.forEach(id => currentTickModelVram[id] = 0);
    let totalClusterBandwidth = 0, totalClusterNvLink = 0;

    const newNodes = state.nodes.map(node => {
        if (node.type === NodeType.HEAD) {
            const transferring = newRequests.filter(r => r.stage === RequestStage.TRANSFER).length;
            return { ...node, gpuUtil: Math.min(80, transferring * 5), status: transferring > 0 ? NodeStatus.COMPUTING : NodeStatus.IDLE };
        }
        
        if (node.status === NodeStatus.OFFLINE) return { ...node, gpuUtil: 0, vramUtil: 0, netUtil: 0, activeTokens: 0, temp: 20 };

        const activeReqs = newRequests.filter(r => 
            (r.stage !== RequestStage.TRANSFER) && 
            (r.targetNodeId === node.id || (r.targetNodeIds && r.targetNodeIds.includes(node.id)))
        );
        
        const load = activeReqs.length;
        let gpuLoadTarget = 0;
        activeReqs.forEach(r => {
            if (r.stage === RequestStage.PREFILL) gpuLoadTarget += 20; 
            else gpuLoadTarget += 5; 
        });

        const util = node.gpuUtil + (Math.min(100, gpuLoadTarget) - node.gpuUtil) * 0.2;
        
        // VRAM Calculation
        let targetVram = 0;
        state.activeModelIds.forEach(mid => {
             const m = MODELS[mid];
             
             if (m.tpSize > 1) {
                 // Distributed model: Consumes VRAM on ALL participating nodes (simplification: if model is active, it reserves VRAM on all nodes for now)
                 targetVram += m.vramPerGpu;
             } else {
                 targetVram += m.vramPerGpu;
             }
             
             const nodeReqs = activeReqs.filter(r => r.modelId === mid);
             if (nodeReqs.length > 0) {
                  targetVram += nodeReqs.length * 0.2; // KV Cache overhead
             }
             
             if (m.tpSize > 1 || nodeReqs.length > 0) {
                 currentTickModelVram[mid] = (currentTickModelVram[mid] || 0) + ((m.vramPerGpu + nodeReqs.length * 0.2) / 100) * node.totalVram;
             }
        });

        totalClusterBandwidth += Math.min(nodeBandwidthDemands[node.id] || 0, currentNetworkCap.bandwidth);
        totalClusterNvLink += nodeNvLinkDemands[node.id] || 0;
        const currentNetUtil = Math.min(100, ((nodeBandwidthDemands[node.id] || 0) / currentNetworkCap.bandwidth) * 100);

        return { 
            ...node, 
            gpuUtil: util, 
            vramUtil: node.vramUtil + (Math.min(100, targetVram) - node.vramUtil) * 0.1,
            netUtil: node.netUtil + (currentNetUtil - node.netUtil) * 0.2, 
            temp: 30 + util * 0.4 + Math.random(), 
            status: util > 2 ? NodeStatus.COMPUTING : NodeStatus.IDLE, 
            activeTokens: load 
        };
    });

    // Metrics
    const throughput = newRequests.filter(r => r.stage === RequestStage.DECODE).length * 10; 
    const costPerTick = newRequests.reduce((acc, r) => acc + ((MODELS[r.modelId]?.tokensPerSec || 0) / 1000 * (MODELS[r.modelId]?.costPer1kTokens || 0) / 60), 0);

    let prevMetric = state.metricsHistory[state.metricsHistory.length - 1];
    let currentAvgLatency = prevMetric ? prevMetric.avgLatency : 0;
    let currentAvgTtft = prevMetric ? prevMetric.avgTtft : 0;

    if (completedLatencies.length > 0) {
        const avg = completedLatencies.reduce((a, b) => a + b, 0) / completedLatencies.length;
        currentAvgLatency = currentAvgLatency * 0.8 + avg * 0.2; 
    }
    if (completedTtfts.length > 0) {
        const avg = completedTtfts.reduce((a, b) => a + b, 0) / completedTtfts.length;
        currentAvgTtft = currentAvgTtft * 0.7 + avg * 0.3; 
    } else {
        if (newRequests.length === 0) {
            currentAvgLatency *= 0.95;
            currentAvgTtft *= 0.95;
        }
    }

    const newMetric: MetricPoint = {
        timestamp: newTime, 
        totalThroughput: throughput, 
        avgLatency: currentAvgLatency,
        avgTtft: currentAvgTtft,
        clusterUtilization: newNodes.reduce((acc, n) => acc + n.gpuUtil, 0) / newNodes.length,
        totalBandwidth: totalClusterBandwidth, 
        totalNvLinkBandwidth: totalClusterNvLink, 
        networkLimit: currentNetworkCap.bandwidth * 10,
        queueDepth: newRequests.filter(r => r.stage === RequestStage.TRANSFER).length, 
        activeUsers: newUsers.length, 
        estimatedCostPerHour: costPerTick * 3600, 
        avgGpuTemp: newNodes.reduce((acc, n) => acc + n.temp, 0) / newNodes.length,
        nodeActiveTokens: Object.fromEntries(newNodes.map(n => [n.id, n.activeTokens])), 
        nodeGpuUtil: Object.fromEntries(newNodes.map(n => [n.id, n.gpuUtil])),
        nodeVramUtil: Object.fromEntries(newNodes.map(n => [n.id, n.vramUtil])), 
        nodeNetUtil: Object.fromEntries(newNodes.map(n => [n.id, n.netUtil])),
        nodeTemp: Object.fromEntries(newNodes.map(n => [n.id, n.temp])), 
        modelVramUsage: currentTickModelVram
    };

    return {
        newState: { ...state, nodes: newNodes, requests: newRequests, metricsHistory: [...state.metricsHistory, newMetric].slice(-300), systemTime: newTime, virtualUsers: newUsers, activityLog: newLog.slice(0, 20) },
        newRrIndex: rrIndex
    };
};
