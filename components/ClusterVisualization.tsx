
import React, { useRef, useEffect } from 'react';
import { SimulationState, NodeType, NodeStatus } from '../types';
import { COLORS } from '../constants';

interface Props {
  simulationState: SimulationState;
  tutorialStep: number | null;
}

const ClusterVisualization: React.FC<Props> = ({ simulationState, tutorialStep }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Isometric projection helper
    const toIso = (x: number, y: number, z: number) => {
      const isoX = (x - y) * Math.cos(Math.PI / 6);
      const isoY = (x + y) * Math.sin(Math.PI / 6) - z;
      return { x: isoX, y: isoY };
    };

    const drawCube = (cx: number, cy: number, cz: number, size: number, color: string, active: boolean, label: string, heightScale: number = 1) => {
        const { x, y } = toIso(cx, cy, cz);
        const h = size * heightScale;
        const w = size; 
        
        const drawY = y;

        // Colors
        const baseColor = active ? color : '#1e293b';
        const topColor = active ? color : '#334155';
        const sideColor = active ? color : '#0f172a';

        // Cube Top (Rhombus)
        ctx.fillStyle = topColor;
        ctx.globalAlpha = active ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x, drawY - h);
        ctx.lineTo(x + w, drawY - h - w/2);
        ctx.lineTo(x, drawY - h - w);
        ctx.lineTo(x - w, drawY - h - w/2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = active ? '#fff' : '#475569';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cube Right Side
        ctx.fillStyle = sideColor;
        ctx.globalAlpha = active ? 0.7 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, drawY - h);
        ctx.lineTo(x + w, drawY - h - w/2);
        ctx.lineTo(x + w, drawY - w/2);
        ctx.lineTo(x, drawY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cube Left Side
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = active ? 0.5 : 0.4;
        ctx.beginPath();
        ctx.moveTo(x, drawY - h);
        ctx.lineTo(x - w, drawY - h - w/2);
        ctx.lineTo(x - w, drawY - w/2);
        ctx.lineTo(x, drawY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.globalAlpha = 1.0;

        if (label) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, drawY + 15);
        }
    };

    const drawPacket = (fromPos: any, toPos: any, progress: number, color: string) => {
        const x = fromPos.x + (toPos.x - fromPos.x) * (progress / 100);
        const y = fromPos.y + (toPos.y - fromPos.y) * (progress / 100);
        const z = fromPos.z + (toPos.z - fromPos.z) * (progress / 100);
        
        const arcHeight = Math.sin((progress / 100) * Math.PI) * 80;
        const iso = toIso(x, y, z + arcHeight);
        
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(iso.x, iso.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    };

    const render = () => {
      time++;
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      ctx.translate(width / 2, height / 2 + 100); // Center origin

      // --- Draw Grid Floor ---
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 300;
      const steps = 6;
      
      for (let i = -steps; i <= steps; i++) {
        const offset = (gridSize / steps) * i;
        const startX = toIso(-gridSize, offset, -50);
        const endX = toIso(gridSize, offset, -50);
        ctx.beginPath(); ctx.moveTo(startX.x, startX.y); ctx.lineTo(endX.x, endX.y); ctx.stroke();
        
        const startY = toIso(offset, -gridSize, -50);
        const endY = toIso(offset, gridSize, -50);
        ctx.beginPath(); ctx.moveTo(startY.x, startY.y); ctx.lineTo(endY.x, endY.y); ctx.stroke();
      }

      // --- Layout Nodes (Grid 2x5) ---
      const headPos = { x: 0, y: -250, z: 100 };
      
      // Filter workers and arrange in 2 rows of 5
      const workers = simulationState.nodes.filter(n => n.type === NodeType.WORKER);
      const workerPositions = workers.map((w, i) => {
        const row = Math.floor(i / 5); // 0 or 1
        const col = i % 5; // 0 to 4
        
        // Centered grid logic
        const spacing = 90;
        const xOffset = (col - 2) * spacing;
        const yOffset = (row - 0.5) * spacing * 1.5;
        
        return {
            id: w.id,
            x: xOffset,
            y: yOffset,
            z: 0,
            node: w
        };
      });

      // --- Draw Connections ---
      // Draw lines from Head to active workers
      ctx.lineWidth = 1;
      workerPositions.forEach(wp => {
          if (wp.node.status === NodeStatus.COMPUTING) {
            const hIso = toIso(headPos.x, headPos.y, headPos.z);
            const wIso = toIso(wp.x, wp.y, wp.z + 20);
            
            ctx.strokeStyle = COLORS.ray;
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.moveTo(hIso.x, hIso.y); ctx.lineTo(wIso.x, wIso.y); ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
      });

      // --- Draw Workers (Server Racks) ---
      workerPositions.forEach(wp => {
        // Base (Server Chassis)
        drawCube(wp.x, wp.y, wp.z, 30, '#334155', false, wp.node.name.split(' ')[1], 0.5); // Flat base

        // GPU 1 (Left block)
        const active = wp.node.status === NodeStatus.COMPUTING;
        // If heavily loaded, shake slightly
        const shake = active && simulationState.activeModelId === 'llama-405b' ? (Math.random() - 0.5) * 2 : 0;
        
        drawCube(wp.x - 10 + shake, wp.y + shake, wp.z + 15, 10, COLORS.vllm, active, '', 1);
        // GPU 2 (Right block)
        drawCube(wp.x + 10 + shake, wp.y + shake, wp.z + 15, 10, COLORS.vllm, active, '', 1);

        // VRAM Indicators (Floating dots above)
        const vramHeight = (wp.node.vramUtil / 100) * 40;
        if (wp.node.vramUtil > 5) {
            const topIso = toIso(wp.x, wp.y, wp.z + 35 + vramHeight);
            ctx.fillStyle = simulationState.activeModelId === 'llama-405b' ? '#fb7185' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(topIso.x, topIso.y, 3, 0, Math.PI*2);
            ctx.fill();
            
            // Connect dot to server
            const baseIso = toIso(wp.x, wp.y, wp.z + 30);
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(baseIso.x, baseIso.y); ctx.lineTo(topIso.x, topIso.y); ctx.stroke();
        }
      });

      // --- Draw Head Node ---
      drawCube(headPos.x, headPos.y, headPos.z, 25, COLORS.ray, true, "Ray Head");

      // --- Draw Packets (Requests) ---
      simulationState.requests.forEach(req => {
          if (req.progress < 100) {
             // If distributed (405B), visualization splits into many particles
             if (req.parallelShards > 1) {
                 workerPositions.forEach((wp, idx) => {
                     // Create a "swarm" effect moving to all nodes
                     // Use ID hash to determine offset so it doesn't look identical
                     const offset = (idx * 10) % 100; 
                     // Only draw if cycle matches to avoid visual clutter? No, draw all for massive effect.
                     drawPacket(headPos, wp, req.progress, req.color);
                 });
             } else {
                 // Single target
                 const target = workerPositions.find(w => w.id === req.targetNodeId);
                 if (target) {
                     drawPacket(headPos, target, req.progress, req.color);
                 }
             }
          }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [simulationState, tutorialStep]);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 pointer-events-none">
            <div className="text-xs text-slate-400 font-mono uppercase tracking-widest mb-1">Cluster View</div>
            <div className="text-sm font-bold text-slate-200">Isometric Projection</div>
        </div>
        <div className="absolute bottom-4 right-4 pointer-events-none flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span className="w-2 h-2 bg-sky-600 rounded-sm"></span> Ray Head
             </div>
             <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                <span className="w-2 h-2 bg-rose-600 rounded-sm"></span> vLLM Worker (2x GPU)
             </div>
        </div>
    </div>
  );
};

export default ClusterVisualization;
