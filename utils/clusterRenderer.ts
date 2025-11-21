
import { SimulationState, NodeType, NodeStatus, NetworkSpeed, RequestStage } from '../types';
import { COLORS, MODELS, NETWORK_CAPACITY } from '../constants';
import { drawGrid, drawCube, drawPacket, toIso } from './canvasDrawing';

const drawRack = (ctx: CanvasRenderingContext2D, label: string, rowIndex: number, heightScale: number = 1) => {
    const yCenter = (rowIndex - 0.5) * 135;
    // Dynamically size rack based on width required? For now standard width
    const width = 250; 
    const p1 = toIso(-width, yCenter - 60 * heightScale, -10);
    const p2 = toIso(width, yCenter - 60 * heightScale, -10);
    const p3 = toIso(width, yCenter + 60 * heightScale, -10);
    const p4 = toIso(-width, yCenter + 60 * heightScale, -10);
    
    ctx.fillStyle = '#1e293b';
    ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

    const labelPos = toIso(-(width + 30), yCenter, 0);
    ctx.fillStyle = '#64748b'; ctx.font = 'bold 10px JetBrains Mono'; ctx.textAlign = 'right'; ctx.fillText(label, labelPos.x, labelPos.y);
};

export const renderCluster = (
    ctx: CanvasRenderingContext2D, width: number, height: number,
    state: SimulationState, netSpeed: NetworkSpeed
) => {
    const dpr = window.devicePixelRatio || 1;
    if (ctx.canvas.width !== width * dpr) { ctx.canvas.width = width * dpr; ctx.canvas.height = height * dpr; }
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.scale(dpr, dpr); ctx.translate(width / 2, height / 2 + 100);
    
    // Determine layout based on node count
    const workers = state.nodes.filter(n => n.type === NodeType.WORKER);
    const totalWorkers = workers.length;
    const nodesPerRow = Math.ceil(totalWorkers / 2); // Split into 2 racks
    const rackScale = nodesPerRow > 6 ? 1.2 : 1.0; // Make racks slightly bigger if lots of nodes

    drawGrid(ctx, 350 * rackScale, 7);
    
    drawRack(ctx, "RACK 1 (Zone A)", 0, rackScale);
    drawRack(ctx, "RACK 2 (Zone B)", 1, rackScale);
    
    const head = { x: 0, y: -250, z: 100 };
    
    // Calculate positions dynamically
    const wPos = workers.map((w, i) => {
        const isRack2 = i >= nodesPerRow;
        const rowIdx = isRack2 ? 1 : 0;
        const colIdx = isRack2 ? (i - nodesPerRow) : i;
        
        // Center the nodes in the rack
        const rowWidth = 90 * nodesPerRow;
        const startX = -((nodesPerRow - 1) * 90) / 2;
        
        return { 
            id: w.id, 
            x: startX + (colIdx * 90), 
            y: (rowIdx - 0.5) * 135, 
            z: 0, 
            node: w 
        };
    });

    // 1. Static Connections (Control Plane)
    wPos.forEach(wp => {
        if (wp.node.status !== NodeStatus.OFFLINE) {
           const h = toIso(head.x, head.y, head.z), w = toIso(wp.x, wp.y, wp.z + 20);
           ctx.strokeStyle = COLORS.ray; ctx.lineWidth = 1; ctx.globalAlpha = 0.2; 
           ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(w.x, w.y); ctx.stroke(); ctx.globalAlpha = 1;
        }
    });

    const activeIds = state.activeModelIds;
    const isDist = activeIds.some(id => MODELS[id]?.tpSize > 1);
    // Now checks if any active model requires large VRAM relative to node capability
    const isNvLink = activeIds.some(id => {
         // Heuristic: visual NVLink activation if VRAM usage is high on a single node
         const m = MODELS[id];
         return m.tpSize === 1 && m.vramRequiredGB > 40; 
    });
    
    const time = Date.now() / 1000;
    const capacity = NETWORK_CAPACITY[netSpeed];
    
    let animSpeed = 1.0;
    if (netSpeed === NetworkSpeed.IB_400G) animSpeed = 2.5;
    else if (netSpeed === NetworkSpeed.ETH_100G) animSpeed = 1.0;
    else animSpeed = 0.3;

    // 2. Inter-Node Sync Links (Tensor Parallel Ring/Mesh)
    if (isDist) {
      const dashPattern = netSpeed === NetworkSpeed.ETH_10G ? [12, 8] : [8, 4];
      ctx.setLineDash(dashPattern); ctx.lineDashOffset = -time * 50 * animSpeed; 
      
      const activeWorkerPositions = wPos.filter(wp => wp.node.status !== NodeStatus.OFFLINE);
      
      if (activeWorkerPositions.length > 1) {
          ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 3; 
          ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 10;
          
          ctx.beginPath();
          activeWorkerPositions.forEach((wp, i) => {
              const next = activeWorkerPositions[(i + 1) % activeWorkerPositions.length];
              const p1 = toIso(wp.x, wp.y, wp.z + 15);
              const p2 = toIso(next.x, next.y, next.z + 15);
              
              if (i === 0) ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);

              // Draw "Data Packet" flowing on the ring
              const pt = (time * animSpeed + (i / activeWorkerPositions.length)) % 1;
              const px = p1.x + (p2.x - p1.x) * pt;
              const py = p1.y + (p2.y - p1.y) * pt;
              
              ctx.save();
              ctx.fillStyle = '#f0abfc'; 
              ctx.shadowBlur = 15; ctx.shadowColor = '#e879f9';
              ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill();
              ctx.restore();
          });
          ctx.closePath();
          ctx.stroke();

          const centerNode = activeWorkerPositions[Math.floor(activeWorkerPositions.length / 2)];
          const lbl = toIso(centerNode.x, centerNode.y, 80);
          ctx.fillStyle = '#e879f9'; ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center'; 
          ctx.fillText("ALL-REDUCE RING", lbl.x, lbl.y);
      }

      ctx.setLineDash([]); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }

    // 3. Draw Nodes
    drawCube(ctx, head.x, head.y, head.z, 25, COLORS.ray, true, "Ray Head");
    wPos.forEach(wp => {
      const isOffline = wp.node.status === NodeStatus.OFFLINE;
      const active = !isOffline && wp.node.status === NodeStatus.COMPUTING;
      
      if (isOffline) {
          drawCube(ctx, wp.x, wp.y, wp.z, 30, '#0f172a', false, wp.node.name.split(' ')[1], 0.5);
          const iso = toIso(wp.x, wp.y, wp.z + 15);
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(iso.x, iso.y, 20, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = '#ef4444'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center'; ctx.fillText("OFFLINE", iso.x, iso.y + 4);
          return;
      }

      const isPrefilling = state.requests.some(r => 
          (r.targetNodeId === wp.id || (r.targetNodeIds && r.targetNodeIds.includes(wp.id))) && 
          r.stage === RequestStage.PREFILL
      );
      const glowColor = isPrefilling ? 'rgba(250, 204, 21, 0.6)' : 'rgba(168, 85, 247, 0.4)';

      if (active && (isDist || isNvLink)) { 
           const iso = toIso(wp.x, wp.y, wp.z + 15);
           const g = ctx.createRadialGradient(iso.x, iso.y, 5, iso.x, iso.y, 30);
           g.addColorStop(0, glowColor); g.addColorStop(1, 'rgba(0,0,0,0)');
           ctx.fillStyle = g; ctx.beginPath(); ctx.arc(iso.x, iso.y, 35, 0, Math.PI*2); ctx.fill();
      }

      const shake = active && (isDist || isNvLink) ? (Math.random() - 0.5) * 2 : 0;
      drawCube(ctx, wp.x, wp.y, wp.z, 30, '#334155', false, wp.node.name.split(' ')[1], 0.5);
      
      // Draw Small cubes for GPUs. If gpusCount is small, draw individually. If large, just draw a block representation.
      const gpuCount = wp.node.gpusCount || 2;
      const visualGpus = Math.min(gpuCount, 4); // Cap visual complexity
      
      for(let g=0; g<visualGpus; g++) {
          const offset = (g - (visualGpus-1)/2) * 10;
          drawCube(ctx, wp.x + offset + shake, wp.y + shake, wp.z + 15, 8, COLORS.vllm, active, '', 1);
      }
      
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
      
      if (isPrefilling) {
           const ind = toIso(wp.x, wp.y, wp.z + 50);
           ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(ind.x, ind.y, 3, 0, Math.PI*2); ctx.fill();
      }
    });

    // 4. Request Packets
    state.requests.filter(r => r.stage === RequestStage.TRANSFER).forEach(req => {
       if (req.parallelShards > 1 && req.targetNodeIds) {
           req.targetNodeIds.forEach(targetId => {
               const t = wPos.find(w => w.id === targetId);
               if(t && t.node.status !== NodeStatus.OFFLINE) {
                   drawPacket(ctx, head, t, req.progress, req.color);
               }
           });
       }
       else { 
           const t = wPos.find(w => w.id === req.targetNodeId); 
           if(t && t.node.status !== NodeStatus.OFFLINE) {
               drawPacket(ctx, head, t, req.progress, req.color);
           }
       }
    });
};
