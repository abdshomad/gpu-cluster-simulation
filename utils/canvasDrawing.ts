
import { COLORS } from '../constants';

export const toIso = (x: number, y: number, z: number) => ({
  x: (x - y) * Math.cos(Math.PI / 6),
  y: (x + y) * Math.sin(Math.PI / 6) - z
});

export const drawCube = (
  ctx: CanvasRenderingContext2D, cx: number, cy: number, cz: number, 
  size: number, color: string, active: boolean, label: string, heightScale: number = 1
) => {
    const { x, y } = toIso(cx, cy, cz);
    const h = size * heightScale;
    const w = size;
    const drawY = y;
    const baseColor = active ? color : '#1e293b';
    const topColor = active ? color : '#334155';
    const sideColor = active ? color : '#0f172a';

    // Top
    ctx.fillStyle = topColor;
    ctx.globalAlpha = active ? 0.9 : 0.6;
    ctx.beginPath(); ctx.moveTo(x, drawY - h); ctx.lineTo(x + w, drawY - h - w/2);
    ctx.lineTo(x, drawY - h - w); ctx.lineTo(x - w, drawY - h - w/2); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = active ? '#fff' : '#475569'; ctx.lineWidth = 1; ctx.stroke();

    // Right
    ctx.fillStyle = sideColor; ctx.globalAlpha = active ? 0.7 : 0.5;
    ctx.beginPath(); ctx.moveTo(x, drawY - h); ctx.lineTo(x + w, drawY - h - w/2);
    ctx.lineTo(x + w, drawY - w/2); ctx.lineTo(x, drawY); ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Left
    ctx.fillStyle = baseColor; ctx.globalAlpha = active ? 0.5 : 0.4;
    ctx.beginPath(); ctx.moveTo(x, drawY - h); ctx.lineTo(x - w, drawY - h - w/2);
    ctx.lineTo(x - w, drawY - w/2); ctx.lineTo(x, drawY); ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.globalAlpha = 1.0;
    if (label) {
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px JetBrains Mono';
        ctx.textAlign = 'center'; ctx.fillText(label, x, drawY + 15);
    }
};

export const drawPacket = (ctx: CanvasRenderingContext2D, fromPos: any, toPos: any, progress: number, color: string) => {
    const x = fromPos.x + (toPos.x - fromPos.x) * (progress / 100);
    const y = fromPos.y + (toPos.y - fromPos.y) * (progress / 100);
    const z = fromPos.z + (toPos.z - fromPos.z) * (progress / 100);
    const arcHeight = Math.sin((progress / 100) * Math.PI) * 80;
    const iso = toIso(x, y, z + arcHeight);
    
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(iso.x, iso.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
};

export const drawGrid = (ctx: CanvasRenderingContext2D, size: number, steps: number) => {
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
    for (let i = -steps; i <= steps; i++) {
      const offset = (size / steps) * i;
      const startX = toIso(-size, offset, -50); const endX = toIso(size, offset, -50);
      ctx.beginPath(); ctx.moveTo(startX.x, startX.y); ctx.lineTo(endX.x, endX.y); ctx.stroke();
      const startY = toIso(offset, -size, -50); const endY = toIso(offset, size, -50);
      ctx.beginPath(); ctx.moveTo(startY.x, startY.y); ctx.lineTo(endY.x, endY.y); ctx.stroke();
    }
};
