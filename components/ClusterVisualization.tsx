
import React, { useRef, useEffect } from 'react';
import { SimulationState, NodeType, NodeStatus } from '../types';
import { COLORS } from '../constants';
import { drawGrid, drawCube, drawPacket, toIso } from '../utils/canvasDrawing';

interface Props { simulationState: SimulationState; tutorialStep: number | null; }

const ClusterVisualization: React.FC<Props> = ({ simulationState, tutorialStep }) => {
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

      // Connections
      wPos.forEach(wp => {
          if (wp.node.status === NodeStatus.COMPUTING) {
             const hIso = toIso(head.x, head.y, head.z); const wIso = toIso(wp.x, wp.y, wp.z + 20);
             ctx.strokeStyle = COLORS.ray; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(hIso.x, hIso.y); ctx.lineTo(wIso.x, wIso.y); ctx.stroke(); ctx.globalAlpha = 1;
          }
      });

      // Draw Head & Workers
      drawCube(ctx, head.x, head.y, head.z, 25, COLORS.ray, true, "Ray Head");
      wPos.forEach(wp => {
        const active = wp.node.status === NodeStatus.COMPUTING;
        const shake = active && simulationState.activeModelId === 'llama-405b' ? (Math.random() - 0.5) * 2 : 0;
        drawCube(ctx, wp.x, wp.y, wp.z, 30, '#334155', false, wp.node.name.split(' ')[1], 0.5);
        drawCube(ctx, wp.x - 10 + shake, wp.y + shake, wp.z + 15, 10, COLORS.vllm, active, '', 1);
        drawCube(ctx, wp.x + 10 + shake, wp.y + shake, wp.z + 15, 10, COLORS.vllm, active, '', 1);
        if (wp.node.vramUtil > 5) {
            const h = (wp.node.vramUtil / 100) * 40; const t = toIso(wp.x, wp.y, wp.z + 35 + h); const b = toIso(wp.x, wp.y, wp.z + 30);
            ctx.fillStyle = simulationState.activeModelId === 'llama-405b' ? '#fb7185' : '#38bdf8'; ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI*2); ctx.fill();
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

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 pointer-events-none text-xs text-slate-400 font-mono">CLUSTER VIEW</div>
    </div>
  );
};
export default ClusterVisualization;
