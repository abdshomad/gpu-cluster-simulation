
import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, LoadBalancingStrategy, NetworkSpeed, PlacementStrategy, GpuType } from '../types';
import { INITIAL_NODES, generateCluster } from '../constants';
import { calculateNextTick, createVirtualUser } from '../utils/simulationEngine';

export const useSimulation = () => {
  const [simulationState, setSimulationState] = useState<SimulationState>({
    nodes: INITIAL_NODES, requests: [], metricsHistory: [], systemTime: 0,
    activeModelIds: ['tiny-llama'], virtualUsers: [], activityLog: []
  });
  const [isRunning, setIsRunning] = useState(false);
  const [targetUserCount, setTargetUserCount] = useState(5);
  const [lbStrategy, setLbStrategy] = useState<LoadBalancingStrategy>(LoadBalancingStrategy.RANDOM);
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>(NetworkSpeed.IB_400G);
  const [placementStrategy, setPlacementStrategy] = useState<PlacementStrategy>(PlacementStrategy.PACK);
  
  // Hardware Config State
  const [nodeCount, setNodeCount] = useState(10);
  const [gpusPerNode, setGpusPerNode] = useState(2);
  const [gpuType, setGpuType] = useState<GpuType>('A100');

  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;
  const rrIndexRef = useRef(0);

  const tick = useCallback(() => {
    const result = calculateNextTick(
        stateRef.current,
        targetUserCount,
        lbStrategy,
        networkSpeed,
        placementStrategy,
        rrIndexRef.current
    );
    rrIndexRef.current = result.newRrIndex;
    setSimulationState(result.newState);
  }, [targetUserCount, lbStrategy, networkSpeed, placementStrategy]);

  useEffect(() => {
    let i: any;
    if (isRunning) i = setInterval(tick, 80);
    return () => clearInterval(i);
  }, [isRunning, tick]);

  const updateHardware = (count: number, gpus: number, type: GpuType) => {
      setNodeCount(count);
      setGpusPerNode(gpus);
      setGpuType(type);
      
      // Regenerate cluster
      const newNodes = generateCluster(count, gpus, type);
      setSimulationState(prev => ({
          ...prev,
          nodes: newNodes,
          requests: [], // Clear requests as node IDs change
          metricsHistory: [],
          systemTime: 0
      }));
  };

  return { 
    simulationState, setSimulationState, isRunning, setIsRunning, 
    targetUserCount, setTargetUserCount, lbStrategy, setLbStrategy,
    networkSpeed, setNetworkSpeed, placementStrategy, setPlacementStrategy,
    nodeCount, gpusPerNode, gpuType, updateHardware
  };
};
