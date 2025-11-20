import { SimulationState, NodeType, NodeStatus, NetworkSpeed } from '../types';
import { COLORS, MODELS, NETWORK_CAPACITY } from '../constants';
import { drawGrid, drawCube, drawPacket, toIso } from './canvasDrawing';

export const renderCluster = (
    ctx: CanvasRenderingContext2D, width: number, height: number,
    state: SimulationState, netSpeed: NetworkSpeed
) => {
    const dpr = window.devicePixelRatio || 1;
    if (ctx.canvas.width !== width * dpr) { ctx.canvas.width = width * dpr; ctx.canvas.height = height * dpr; }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(dpr, dpr); ctx.translate(width / 2, height / 2 + 100);
    
    drawGrid(ctx, 300, 6);
    
    const workers = state.nodes.filter(n => n.type === NodeType.WORKER);
    const head = { x: 0, y: -250, z: 100 };
    const wPos = workers.map((w, i) => ({ id: w.id, x: ((i % 5) - 2) * 90, y: (Math.floor(i / 5) - 0.5) * 135, z: 0, node: w }));

    // 1. Head -> Worker Connections (Request Distribution)
    // Skip offline nodes
    wPos.forEach(wp => {
        if (wp.node.status !== NodeStatus.OFFLINE) {
           const h = toIso(head.x, head.y, head.z), w = toIso(wp.x, wp.y, wp.z + 20);
           ctx.strokeStyle = COLORS.ray; ctx.lineWidth = 1; ctx.globalAlpha = 0.2; 
           ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(w.x, w.y); ctx.stroke(); ctx.globalAlpha = 1;
        }
    });

    const activeIds = state.activeModelIds;
    const isDist = activeIds.some(id => MODELS[id]?.tpSize > 1);
    const isNvLink = activeIds.some(id => MODELS[id]?.tpSize === 1 && MODELS[id]?.vramPerGpu > 25);
    const time = Date.now() / 1000;
    
    // Latency Visualization Logic
    const capacity = NETWORK_CAPACITY[netSpeed];
    const latency = capacity.latency;
    
    // Animation speed factor: 400G (1ms) is fast (~2.5x), 10G (50ms) is slow (~0.3x)
    let animSpeed = 1.0;
    if (netSpeed === NetworkSpeed.IB_400G) animSpeed = 2.5;
    else if (netSpeed === NetworkSpeed.ETH_100G) animSpeed = 1.0;
    else animSpeed = 0.3;

    // 2. Tensor Parallel Ring Topology (Inter-Node Sync)
    if (isDist) {
      // Visual Cue: Slower networks have wider gaps in the dash pattern
      const dashPattern = netSpeed === NetworkSpeed.ETH_10G ? [12, 8] : [8, 4];
      ctx.setLineDash(dashPattern); 
      ctx.lineDashOffset = -time * 50 * animSpeed; 
      
      wPos.forEach((wp, i) => {
          if (wp.node.status === NodeStatus.OFFLINE) return; // Skip offline

          const nextIndex = (i + 1) % wPos.length;
          const next = wPos[nextIndex];
          
          if (next.node.status === NodeStatus.OFFLINE) return; // Skip link to offline

          if (wp.node.status === NodeStatus.COMPUTING && next.node.status === NodeStatus.COMPUTING) {
              const util = (wp.node.netUtil + next.node.netUtil) / 200;
              const isBtl = util > 0.95;
              
              ctx.strokeStyle = isBtl ? '#ef4444' : '#c084fc'; ctx.lineWidth = isBtl ? 4 : 3;
              ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12; ctx.globalAlpha = Math.min(1, util + 0.5);
              
              const p1 = toIso(wp.x, wp.y, wp.z + 15), p2 = toIso(next.x, next.y, next.z + 15);
              ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
              
              if (util > 0.05) { 
                  const pt = (time * animSpeed) % 1;
                  const px = p1.x + (p2.x - p1.x) * pt, py = p1.y + (p2.y - p1.y) * pt;
                  
                  const blurAmount = Math.max(5, latency / 2);
                  
                  ctx.fillStyle = '#f0abfc'; 
                  ctx.shadowBlur = blurAmount; 
                  ctx.shadowColor = ctx.fillStyle;
                  
                  ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.fill();
                  
                  if (latency > 20) {
                      const lagOffset = 0.15;
                      let ptLag = pt - lagOffset;
                      if (ptLag < 0) ptLag += 1;
                      const pxLag = p1.x + (p2.x - p1.x) * ptLag;
                      const pyLag = p1.y + (p2.y - p1.y) * ptLag;
                      
                      ctx.fillStyle = '#f0abfc';
                      ctx.globalAlpha = 0.3;
                      ctx.beginPath(); ctx.arc(pxLag, pyLag, 4, 0, Math.PI*2); ctx.fill();
                      ctx.globalAlpha = 1.0;
                  }
              }
          }
      });
      ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // 3. Draw Nodes
    drawCube(ctx, head.x, head.y, head.z, 25, COLORS.ray, true, "Ray Head");
    wPos.forEach(wp => {
      const isOffline = wp.node.status === NodeStatus.OFFLINE;
      const active = wp.node.status === NodeStatus.COMPUTING && !isOffline;
      const shake = active && (isDist || isNvLink) ? (Math.random() - 0.5) * 2 : 0;
      
      if (isOffline) {
          // Draw dead node
          drawCube(ctx, wp.x, wp.y, wp.z, 30, '#0f172a', false, wp.node.name.split(' ')[1], 0.5);
          // Red cross or outline
          const iso = toIso(wp.x, wp.y, wp.z + 15);
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(iso.x, iso.y, 20, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
          
          ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
          ctx.fillText("OFFLINE", iso.x, iso.y + 4);
          return;
      }

      if (active && (isDist || isNvLink)) { // NVLink/High-Compute Glow
           const iso = toIso(wp.x, wp.y, wp.z + 15);
           const g = ctx.createRadialGradient(iso.x, iso.y, 5, iso.x, iso.y, 30);
           g.addColorStop(0, 'rgba(168, 85, 247, 0.4)'); g.addColorStop(1, 'rgba(168, 85, 247, 0)');
           ctx.fillStyle = g; ctx.beginPath(); ctx.arc(iso.x, iso.y, 35, 0, Math.PI*2); ctx.fill();
      }

      drawCube(ctx, wp.x, wp.y, wp.z, 30, '#334155', false, wp.node.name.split(' ')[1], 0.5);
      drawCube(ctx, wp.x-10+shake, wp.y+shake, wp.z+15, 10, COLORS.vllm, active, '', 1);
      drawCube(ctx, wp.x+10+shake, wp.y+shake, wp.z+15, 10, COLORS.vllm, active, '', 1);
      
      // Metrics Bars
      const drawBar = (val: number, offX: number, hMax: number, cNorm: string, cHigh: string, label?: string) => {
          if (val <= 5) return;
          const h = (Math.min(100, val) / 100) * hMax;
          const t = toIso(wp.x + offX, wp.y, wp.z + 20 + h + (offX ? 5 : 10));
          const b = toIso(wp.x + offX, wp.y, wp.z + 20 + (offX ? 0 : 10));
          ctx.fillStyle = val > 90 ? cHigh : cNorm; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.x, t.y, offX ? 2 : 3, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
          if (label && val > 90) { ctx.fillStyle = cHigh; ctx.font = 'bold 9px Inter'; ctx.fillText(label, t.x + 10, t.y); }
      };
      drawBar(wp.node.vramUtil, 0, 40, '#38bdf8', '#fb7185');
      drawBar(wp.node.netUtil, 18, 25, '#818cf8', '#ef4444', '!');
    });

    // 4. Request Packets (Head -> Worker)
    state.requests.filter(r => r.progress < 100).forEach(req => {
       if (req.parallelShards > 1) {
           // Distributed: Draw to all ONLINE workers
           wPos.forEach(wp => {
               if (wp.node.status !== NodeStatus.OFFLINE) {
                   drawPacket(ctx, head, wp, req.progress, req.color);
               }
           });
       }
       else { 
           const t = wPos.find(w => w.id === req.targetNodeId); 
           // Only draw if target is online
           if(t && t.node.status !== NodeStatus.OFFLINE) {
               drawPacket(ctx, head, t, req.progress, req.color);
           }
       }
    });
};
