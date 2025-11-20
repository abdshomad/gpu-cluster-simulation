
import React, { useState } from 'react';
import { Server, Activity } from 'lucide-react';
import { MODELS } from './constants';
import ClusterVisualization from './components/ClusterVisualization';
import MetricsDashboard from './components/MetricsDashboard';
import NodeDetailsModal from './components/NodeDetailsModal';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatWidget from './components/ChatWidget';
import TutorialOverlay from './components/TutorialOverlay';
import { useSimulation } from './hooks/useSimulation';

const App: React.FC = () => {
  const { simulationState, setSimulationState, isRunning, setIsRunning, targetUserCount, setTargetUserCount, lbStrategy, setLbStrategy } = useSimulation();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const switchModel = (id: string) => setSimulationState(p => ({ ...p, activeModelId: id, requests: [], metricsHistory: [], activityLog: [] }));
  const activeModel = MODELS[simulationState.activeModelId];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 pb-20">
      <Header 
        activeModelId={simulationState.activeModelId} onSwitchModel={switchModel}
        lbStrategy={lbStrategy} setLbStrategy={setLbStrategy}
        tutorialStep={tutorialStep} setTutorialStep={setTutorialStep}
        isRunning={isRunning} setIsRunning={setIsRunning}
        targetUserCount={targetUserCount} setTargetUserCount={setTargetUserCount}
      />
      {tutorialStep !== null && <TutorialOverlay step={tutorialStep} setStep={(s) => setTutorialStep(s)} />}
      {selectedNodeId && <NodeDetailsModal node={simulationState.nodes.find(n => n.id === selectedNodeId)!} metricsHistory={simulationState.metricsHistory} onClose={() => setSelectedNodeId(null)} />}
      
      <main className="pt-24 px-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Server size={20} className="text-sky-400" /> Cluster Topology <span className="text-sm text-slate-500 font-normal">(10 Workers)</span></h2>
                    <div className="flex gap-3 text-xs">
                        <div className="flex flex-col items-end"><span className="text-slate-500 uppercase">Active Model</span><span className="font-bold text-sky-400">{activeModel.name}</span></div>
                        <div className="flex flex-col items-end"><span className="text-slate-500 uppercase">Est. Cost</span><span className="font-bold text-emerald-400">${simulationState.metricsHistory.slice(-1)[0]?.estimatedCostPerHour.toFixed(2) || '0.00'}/hr</span></div>
                    </div>
                </div>
                <ClusterVisualization simulationState={simulationState} tutorialStep={tutorialStep} />
            </section>
            <section>
                <div className="flex justify-between items-center mb-3"><h2 className="text-xl font-semibold flex items-center gap-2"><Activity size={20} className="text-emerald-400" /> Prometheus Metrics</h2></div>
                <MetricsDashboard data={simulationState.metricsHistory} />
            </section>
        </div>
        <Sidebar state={simulationState} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} />
      </main>
      <ChatWidget simulationState={simulationState} />
    </div>
  );
};
export default App;
