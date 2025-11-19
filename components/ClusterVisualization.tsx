import React, { useRef, useEffect } from 'react';
import { SimulationState, NodeType, NodeStatus } from '../types';
import { COLORS } from '../constants';

interface Props {
  simulationState: SimulationState;
}

const ClusterVisualization: React.FC<Props> = ({ simulationState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      // Handle high DPI
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      // Clear background
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, width, height);

      // Grid background (3Blue1Brown style)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Calculate Layout
      const headNode = simulationState.nodes.find(n => n.type === NodeType.HEAD);
      const workers = simulationState.nodes.filter(n => n.type === NodeType.WORKER);
      
      const centerX = width / 2;
      const headY = 80;
      const workerY = height - 100;
      
      // Draw Connections (Ray Object Store / Control Plane)
      if (headNode) {
        ctx.lineWidth = 2;
        workers.forEach((worker, idx) => {
            // Calculate worker position
            const spacing = width / (workers.length + 1);
            const wx = spacing * (idx + 1);
            const wy = workerY;

            // Dynamic connection line
            const isActive = worker.status === NodeStatus.COMPUTING;
            
            // Gradient Line
            const gradient = ctx.createLinearGradient(centerX, headY + 40, wx, wy - 40);
            gradient.addColorStop(0, COLORS.ray);
            gradient.addColorStop(1, isActive ? COLORS.vllm : '#334155');
            
            ctx.strokeStyle = gradient;
            ctx.setLineDash(isActive ? [5, 5] : []);
            if (isActive) {
                ctx.lineDashOffset = -Date.now() / 20; // Animate flow
            }
            
            ctx.beginPath();
            ctx.moveTo(centerX, headY + 40);
            ctx.bezierCurveTo(centerX, (headY + wy)/2, wx, (headY + wy)/2, wx, wy - 40);
            ctx.stroke();
            ctx.setLineDash([]);
        });
      }

      // Draw Nodes function
      const drawNode = (x: number, y: number, label: string, subLabel: string, type: NodeType, status: NodeStatus, load: number) => {
        const w = 140;
        const h = 80;
        
        // Glow effect for active nodes
        if (status === NodeStatus.COMPUTING) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = type === NodeType.HEAD ? COLORS.ray : COLORS.vllm;
        } else {
            ctx.shadowBlur = 0;
        }

        // Box
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = status === NodeStatus.COMPUTING 
            ? (type === NodeType.HEAD ? COLORS.ray : COLORS.vllm) 
            : '#475569';
        ctx.lineWidth = 2;
        
        // Rounded rect
        const r = 8;
        ctx.beginPath();
        ctx.roundRect(x - w/2, y - h/2, w, h, r);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // Activity Bar (Load)
        const barH = 4;
        const barW = w - 20;
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - barW/2, y + h/2 - 15, barW, barH);
        ctx.fillStyle = type === NodeType.HEAD ? COLORS.ray : COLORS.vllm;
        ctx.fillRect(x - barW/2, y + h/2 - 15, barW * (load / 100), barH);

        // Text
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y - 5);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 12px JetBrains Mono';
        ctx.fillText(subLabel, x, y + 15);
      };

      // Draw Head Node
      if (headNode) {
        drawNode(centerX, headY, "Ray Head", "Scheduler", NodeType.HEAD, headNode.status, headNode.activeTokens > 0 ? 50 : 0);
      }

      // Draw Worker Nodes
      workers.forEach((worker, idx) => {
        const spacing = width / (workers.length + 1);
        const wx = spacing * (idx + 1);
        drawNode(wx, workerY, worker.name, `${worker.activeTokens} toks/s`, NodeType.WORKER, worker.status, worker.gpuUtil);
      });

      // Draw Requests (Particles)
      simulationState.requests.forEach(req => {
        // Simple interpolation of request packet position based on "progress" logic
        // In a real app, we'd track detailed position. Here we visualize flow.
        // Just floating particles around active workers to simulate tokens
        
        if (req.progress < 100) {
            workers.forEach((worker, wIdx) => {
                 // Only draw particles for active workers participating in this request
                if (worker.status === NodeStatus.COMPUTING) {
                    const spacing = width / (workers.length + 1);
                    const wx = spacing * (wIdx + 1);
                    
                    // Particles flowing OUT of the worker (Token Generation)
                    const time = Date.now() / 100;
                    const particleY = workerY - 50 - (time % 50); // moving up
                    const particleX = wx + Math.sin(time + wIdx) * 10;
                    
                    ctx.fillStyle = req.color;
                    ctx.beginPath();
                    ctx.arc(particleX, particleY, 4, 0, Math.PI * 2);
                    ctx.fill();

                    // Text label for tensor shard
                    ctx.fillStyle = req.color;
                    ctx.font = '10px JetBrains Mono';
                    ctx.fillText("KV-Cache", particleX + 10, particleY);
                }
            });
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [simulationState]);

  return (
    <div className="relative w-full h-96 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-full block" />
        <div className="absolute top-4 left-4 text-xs text-slate-400 font-mono">
            VISUALIZATION: TENSOR PARALLELISM RING
        </div>
    </div>
  );
};

export default ClusterVisualization;
