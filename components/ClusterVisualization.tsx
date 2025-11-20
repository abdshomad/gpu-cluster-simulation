

import React, { useRef, useEffect } from 'react';
import { SimulationState, NodeType, NodeStatus, NetworkSpeed } from '../types';
import { COLORS, MODELS, NETWORK_CAPACITY } from '../constants';
import { drawGrid, drawCube, drawPacket, toIso } from '../utils/canvasDrawing';

interface Props { 
    simulationState: SimulationState; 
    tutorialStep: number | null;
    networkSpeed?: NetworkSpeed;
}

const ClusterVisualization: React.FC<Props> = ({ simulationState, tutorialStep, networkSpeed = NetworkSpeed.IB_400G }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frameId: number;

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr); ctx.translate(width / 2, height / 2 + 100);

      drawGrid(ctx, 300, 6);
      
      const workers = simulationState.nodes.filter(n => n.type === NodeType.WORKER);
      const head = { x: 0, y: -250, z: 100 };
      const wPos = workers.map((w, i) => ({ id: w.id, x: ((i % 5) - 2) * 90, y: (Math.floor(i / 5) - 0.5) * 135, z: 0, node: w }));

      // Connections (Head -> Worker)
      wPos.forEach(wp => {
          if (wp.node.status === NodeStatus.COMPUTING) {
             const hIso = toIso(head.x, head.y, head.z); const wIso = toIso(wp.x, wp.y, wp.z + 20);
             ctx.strokeStyle = COLORS.ray; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(hIso.x, hIso.y); ctx.lineTo(wIso.x, wIso.y); ctx.stroke(); ctx.globalAlpha = 1;
          }
      });

      // Check if a large model is active to trigger shake effects and data transfer viz
      const activeModels = simulationState.activeModelIds;
      const isLargeModelActive = activeModels.includes('llama-405b') || activeModels.includes('deepseek-r1');
      
      // Inter-Node Data Transfer Visualization (AllReduce Simulation)
      const isDistributed = activeModels.some(id => MODELS[id] && MODELS[id].tpSize > 1);
      // Check for large single-node models that use NVLink
      const isHighNvLink = activeModels.some(id => MODELS[id] && MODELS[id].tpSize === 1 && MODELS[id].vramPerGpu > 25);
      
      let maxNetUtil = 0;
      const time = Date.now() / 50;
      
      if (isDistributed) {
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -time;
        
        wPos.forEach((wp, i) => {
            if (wp.node.status !== NodeStatus.COMPUTING) return;
            if (wp.node.netUtil > maxNetUtil) maxNetUtil = wp.node.netUtil;

            // Connect to neighbor to form a mesh/ring
            if (i < wPos.length - 1) {
                const next = wPos[i+1];
                if (next.node.status === NodeStatus.COMPUTING) {
                    // Scale opacity by network utilization
                    const util = (wp.node.netUtil + next.node.netUtil) / 200; // 0-1 normalized to capacity
                    
                    // Color shift: Indigo (Normal) -> Red (Bottleneck)
                    const isBottlenecked = util > 0.95;
                    
                    ctx.strokeStyle = isBottlenecked ? '#ef4444' : '#818cf8'; 
                    ctx.lineWidth = isBottlenecked ? 3 : 2;
                    ctx.globalAlpha = Math.min(1, util + 0.2);
                    
                    if (isBottlenecked) {
                        ctx.shadowColor = '#ef4444';
                        ctx.shadowBlur = 10;
                    }
                    
                    const p1 = toIso(wp.x, wp.y, wp.z + 15);
                    const p2 = toIso(next.x, next.y, next.z + 15);
                    
                    ctx.beginPath(); 
                    ctx.moveTo(p1.x, p1.y); 
                    ctx.lineTo(p2.x, p2.y); 
                    ctx.stroke();
                    
                    ctx.shadowBlur = 0;
                }
            }
        });
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      }

      // Draw Head & Workers
      drawCube(ctx, head.x, head.y, head.z, 25, COLORS.ray, true, "Ray Head");
      wPos.forEach(wp => {
        const active = wp.node.status === NodeStatus.COMPUTING;
        const shake = active && isLargeModelActive ? (Math.random() - 0.5) * 2 : 0;
        
        // Draw NVLink Activity Glow (Internal Pulse)
        if (active && (isDistributed || isHighNvLink)) {
             const pulse = Math.sin(Date.now() / 100) * 5 + 10;
             const iso = toIso(wp.x, wp.y, wp.z + 15);
             ctx.fillStyle = '#a855f7'; // Purple for NVLink
             ctx.globalAlpha = 0.2;
             ctx.beginPath(); ctx.arc(iso.x, iso.y, 20 + pulse/2, 0, Math.PI * 2); ctx.fill();
             ctx.globalAlpha = 1.0;
        }

        drawCube(ctx, wp.x, wp.y, wp.z, 30, '#334155', false, wp.node.name.split(' ')[1], 0.5);
        drawCube(ctx, wp.x - 10 + shake, wp.y + shake, wp.z + 15, 10, COLORS.vllm, active, '', 1);
        drawCube(ctx, wp.x + 10 + shake, wp.y + shake, wp.z + 15, 10, COLORS.vllm, active, '', 1);
        if (wp.node.vramUtil > 5) {
            const h = (Math.min(100, wp.node.vramUtil) / 100) * 40; 
            const t = toIso(wp.x, wp.y, wp.z + 35 + h); 
            const b = toIso(wp.x, wp.y, wp.z + 30);
            // Color shift based on VRAM pressure
            const isHighPressure = wp.node.vramUtil > 90;
            ctx.fillStyle = isHighPressure ? '#fb7185' : '#38bdf8'; 
            ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = ctx.fillStyle; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        }
      });

      // Packets
      simulationState.requests.forEach(req => {
          if (req.progress < 100) {
             if (req.parallelShards > 1) wPos.forEach(wp => drawPacket(ctx, head, wp, req.progress, req.color));
             else { const t = wPos.find(w => w.id === req.targetNodeId); if(t) drawPacket(ctx, head, t, req.progress, req.color); }
          }
      });
      frameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [simulationState]);

  const capacity = NETWORK_CAPACITY[networkSpeed];
  // Check if cluster is bottlenecked
  const isBottlenecked = simulationState.nodes.some(n => n.netUtil > 95);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 pointer-events-none text-xs text-slate-400 font-mono">CLUSTER VIEW</div>
        
        {/* Network Status Overlay */}
        <div className="absolute top-4 right-4 pointer-events-none flex flex-col items-end gap-2">
             <div className="flex flex-col items-end bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 backdrop-blur">
                 <span className="text-[10px] font-bold uppercase text-slate-500 mb-1">Interconnect Speed</span>
                 <span className="text-lg font-mono font-bold text-slate-200">{capacity.label} <span className="text-xs text-slate-500 font-normal">({capacity.bandwidth} GB/s)</span></span>
             </div>
             
             {isBottlenecked && (
                 <div className="bg-red-500/20 border border-red-500/50 px-3 py-1 rounded flex items-center gap-2 animate-pulse">
                     <div className="w-2 h-2 rounded-full bg-red-500"></div>
                     <span className="text-xs font-bold text-red-400 uppercase">Network Saturation</span>
                 </div>
             )}
        </div>

        <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-sky-600"></span> Ray Control
             </div>
             <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-[#818cf8]"></span> Inter-Node Data
             </div>
             <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-[#a855f7]"></span> Intra-Node (NVLink)
             </div>
        </div>
    </div>
  );
};
export default ClusterVisualization;