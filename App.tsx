

import React, { useState } from 'react';
import { Server, Activity } from 'lucide-react';
import { MODELS } from './constants';
import { NodeStatus } from './types';
import ClusterVisualization from './components/ClusterVisualization';
import MetricsDashboard from './components/MetricsDashboard';
import NodeDetailsModal from './components/NodeDetailsModal';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatWidget from './components/ChatWidget';
import TutorialOverlay from './components/TutorialOverlay';
import { useSimulation } from './hooks/useSimulation';

const App: React.FC = () => {
  const { 
    simulationState, setSimulationState, 
    isRunning, setIsRunning, 
    targetUserCount, setTargetUserCount, 
    lbStrategy, setLbStrategy,
    networkSpeed, setNetworkSpeed,
    placementStrategy, setPlacementStrategy
  } = useSimulation();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const toggleModel = (id: string) => {
      setSimulationState(prev => {
          const currentIds = prev.activeModelIds;
          // Toggle logic: remove if exists, add if not. Prevent empty list.
          let newIds;
          if (currentIds.includes(id)) {
              if (currentIds.length === 1) return prev; // Keep at least one
              newIds = currentIds.filter(m => m !== id);
          } else {
              newIds = [...currentIds, id];
          }
          return { ...prev, activeModelIds: newIds, requests: [], metricsHistory: [], activityLog: [] };
      });
  };

  const toggleNodeStatus = (nodeId: string) => {
      setSimulationState(prev => {
          const newNodes = prev.nodes.map(n => {
              if (n.id === nodeId) {
                  // Reset metrics when going offline
                  if (n.status !== NodeStatus.OFFLINE) {
                      return { ...n, status: NodeStatus.OFFLINE, gpuUtil: 0, vramUtil: 0, netUtil: 0, activeTokens: 0, temp: 20 };
                  }
                  // Returning to IDLE, other stats will recover in next tick
                  return { ...n, status: NodeStatus.IDLE };
              }
              return n;
          });
          return { ...prev, nodes: newNodes };
      });
  };

  const getActiveModelNames = () => {
      const ids = simulationState.activeModelIds;
      if (ids.length === 0) return "None";
      if (ids.length === 1) return MODELS[ids[0]].name;
      if (ids.length <= 2) return ids.map(id => MODELS[id].name).join(' & ');
      return `${ids.length} Models Active`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 pb-20">
      <Header 
        activeModelIds={simulationState.activeModelIds} onToggleModel={toggleModel}
        lbStrategy={lbStrategy} setLbStrategy={setLbStrategy}
        networkSpeed={networkSpeed} setNetworkSpeed={setNetworkSpeed}
        placementStrategy={placementStrategy} setPlacementStrategy={setPlacementStrategy}
        tutorialStep={tutorialStep} setTutorialStep={setTutorialStep}
        isRunning={isRunning} setIsRunning={setIsRunning}
        targetUserCount={targetUserCount} setTargetUserCount={setTargetUserCount}
      />
      {tutorialStep !== null && <TutorialOverlay step={tutorialStep} setStep={(s) => setTutorialStep(s)} />}
      {selectedNodeId && (
          <NodeDetailsModal 
            node={simulationState.nodes.find(n => n.id === selectedNodeId)!} 
            metricsHistory={simulationState.metricsHistory} 
            onClose={() => setSelectedNodeId(null)} 
            onToggleStatus={() => toggleNodeStatus(selectedNodeId)}
          />
      )}
      
      <main className="pt-24 px-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
            <section id="cluster-view">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Server size={20} className="text-sky-400" /> Cluster Topology <span className="text-sm text-slate-500 font-normal">(10 Workers)</span></h2>
                    <div id="cluster-stats-header" className="flex gap-3 text-xs">
                        <div className="flex flex-col items-end"><span className="text-slate-500 uppercase">Active Models</span><span className="font-bold text-sky-400">{getActiveModelNames()}</span></div>
                        <div className="flex flex-col items-end"><span className="text-slate-500 uppercase">Est. Cost</span><span className="font-bold text-emerald-400">${simulationState.metricsHistory.slice(-1)[0]?.estimatedCostPerHour.toFixed(2) || '0.00'}/hr</span></div>
                    </div>
                </div>
                <ClusterVisualization simulationState={simulationState} tutorialStep={tutorialStep} networkSpeed={networkSpeed} />
            </section>
            <section id="metrics-dashboard">
                <MetricsDashboard 
                  data={simulationState.metricsHistory} 
                  users={simulationState.virtualUsers}
                />
            </section>
        </div>
        <Sidebar state={simulationState} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} />
      </main>
      <ChatWidget simulationState={simulationState} />
    </div>
  );
};
export default App;