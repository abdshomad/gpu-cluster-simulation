import { useState, useRef, useCallback, useEffect } from 'react';
import { SimulationState, LoadBalancingStrategy, NetworkSpeed } from '../types';
import { INITIAL_NODES } from '../constants';
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
  
  const stateRef = useRef(simulationState);
  stateRef.current = simulationState;
  const rrIndexRef = useRef(0);

  const tick = useCallback(() => {
    const result = calculateNextTick(
        stateRef.current,
        targetUserCount,
        lbStrategy,
        networkSpeed,
        rrIndexRef.current
    );
    rrIndexRef.current = result.newRrIndex;
    setSimulationState(result.newState);
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