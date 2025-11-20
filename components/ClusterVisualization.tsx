
import React, { useRef, useEffect } from 'react';
import { SimulationState, NetworkSpeed } from '../types';
import { NETWORK_CAPACITY, MODELS } from '../constants';
import { renderCluster } from '../utils/clusterRenderer';

interface Props { 
    simulationState: SimulationState; 
    tutorialStep: number | null;
    networkSpeed?: NetworkSpeed;
}

const ClusterVisualization: React.FC<Props> = ({ simulationState, tutorialStep, networkSpeed = NetworkSpeed.IB_400G }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    
    const render = () => {
        // Get parent dimensions for responsive sizing
        const { width, height } = canvas.getBoundingClientRect();
        renderCluster(ctx, width, height, simulationState, networkSpeed);
        frameId = requestAnimationFrame(render);
    };
    
    render();
    return () => cancelAnimationFrame(frameId);
  }, [simulationState, networkSpeed]);

  const capacity = NETWORK_CAPACITY[networkSpeed];
  // Check if cluster is bottlenecked (any node > 95% network util)
  const isBottlenecked = simulationState.nodes.some(n => n.netUtil > 95);
  // Check for distributed models
  const isDistributed = simulationState.activeModelIds.some(id => MODELS[id] && MODELS[id].tpSize > 1);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        <div className="absolute top-4 left-4 pointer-events-none text-xs text-slate-400 font-mono tracking-wider">CLUSTER VISUALIZATION</div>
        
        {/* Network Status Overlay */}
        <div className="absolute top-4 right-4 pointer-events-none flex flex-col items-end gap-2">
             <div className="flex flex-col items-end bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 backdrop-blur">
                 <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">Interconnect Speed</span>
                 <div className="flex items-baseline gap-2">
                    <span className="text-lg font-mono font-bold text-slate-200">{capacity.label}</span>
                    <span className="text-xs text-slate-500 font-normal">({capacity.bandwidth} GB/s)</span>
                 </div>
                 <span className="text-[9px] text-slate-600 mt-0.5">Latency Factor: {capacity.latency}x</span>
             </div>
             
             {isBottlenecked && (
                 <div className="bg-red-500/20 border border-red-500/50 px-3 py-1 rounded flex items-center gap-2 animate-pulse">
                     <div className="w-2 h-2 rounded-full bg-red-500"></div>
                     <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Network Saturation</span>
                 </div>
             )}
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end gap-1.5">
             <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-sky-600"></span> Ray Control (Head Node)
             </div>
             
             {isDistributed ? (
                <div className="flex items-center gap-2 text-[10px] text-purple-300 bg-purple-900/40 px-2 py-1.5 rounded border border-purple-500/30 animate-in fade-in">
                    <span className="w-4 h-0.5 bg-purple-400 shadow-[0_0_8px_#a855f7]"></span> Tensor Parallel Sync
                </div>
             ) : (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                    <span className="w-2 h-2 rounded-full bg-[#818cf8]"></span> Inter-Node (Network)
                </div>
             )}
             
             <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-[#a855f7]"></span> Intra-Node (NVLink)
             </div>
             <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-[#e11d48]"></span> vLLM Workers (GPU)
             </div>
        </div>
    </div>
  );
};
export default ClusterVisualization;
