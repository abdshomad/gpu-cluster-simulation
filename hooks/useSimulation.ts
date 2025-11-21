


import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, LoadBalancingStrategy, NetworkSpeed, PlacementStrategy, GpuType, HardwareTemplate } from '../types';
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
  
  // Hardware Config State (Scalar values for custom mode)
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
      
      // Regenerate cluster - homogeneous
      const newNodes = generateCluster([{ count, gpusPerNode: gpus, gpuType: type }]);
      setSimulationState(prev => ({
          ...prev,
          nodes: newNodes,
          requests: [], // Clear requests as node IDs change
          metricsHistory: [],
          systemTime: 0
      }));
  };

  const applyTemplate = (template: HardwareTemplate) => {
      // Update sliders to match the first group of the template just for UI consistency,
      // even though it's a hybrid cluster.
      if (template.specs.length > 0) {
          setNodeCount(template.specs.reduce((acc, s) => acc + s.count, 0));
          setGpusPerNode(template.specs[0].gpusPerNode);
          setGpuType(template.specs[0].gpuType);
      }

      const newNodes = generateCluster(template.specs);
      setSimulationState(prev => ({
          ...prev,
          nodes: newNodes,
          requests: [],
          metricsHistory: [],
          systemTime: 0
      }));
  };

  return { 
    simulationState, setSimulationState, isRunning, setIsRunning, 
    targetUserCount, setTargetUserCount, lbStrategy, setLbStrategy,
    networkSpeed, setNetworkSpeed, placementStrategy, setPlacementStrategy,
    nodeCount, gpusPerNode, gpuType, updateHardware, applyTemplate
  };
};