
import React from 'react';
import { X, Cpu, Thermometer, Zap, Activity, Server } from 'lucide-react';
import { ClusterNode, MetricPoint, NodeType } from '../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  node: ClusterNode;
  onClose: () => void;
  metricsHistory: MetricPoint[];
}

const NodeDetailsModal: React.FC<Props> = ({ node, onClose, metricsHistory }) => {
  // Extract history for this node's active tokens (last 20 points to show trend)
  const nodeHistory = metricsHistory.slice(-20).map(m => ({
    timestamp: m.timestamp,
    value: m.nodeActiveTokens[node.id] || 0
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${node.type === NodeType.HEAD ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                <Server size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-100">{node.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{node.id}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
           {/* Status Grid */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                 <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                    <Thermometer size={18} />
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Temperature</p>
                    <p className="text-lg font-mono font-semibold text-slate-200">{node.temp.toFixed(1)}°C</p>
                 </div>
              </div>
              
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                 <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Zap size={18} />
                 </div>
                 <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Active Tokens</p>
                    <p className="text-lg font-mono font-semibold text-slate-200">{node.activeTokens}</p>
                 </div>
              </div>
           </div>

           {/* Util Bars */}
           <div className="space-y-4">
              <div>
                 <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-2"><Cpu size={14} /> GPU Utilization</span>
                    <span className="font-mono text-slate-200">{node.gpuUtil.toFixed(1)}%</span>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500" style={{ width: `${node.gpuUtil}%` }} />
                 </div>
              </div>

              <div>
                 <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-2"><Activity size={14} /> VRAM Utilization</span>
                    <span className="font-mono text-slate-200">{node.vramUtil.toFixed(1)}%</span>
                 </div>
                 <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-500" style={{ width: `${node.vramUtil}%` }} />
                 </div>
              </div>
           </div>

           {/* Mini Chart for Active Tokens */}
           <div className="h-32 w-full bg-slate-950/30 rounded-xl border border-slate-800/50 p-2 overflow-hidden relative">
              <p className="absolute top-2 left-3 text-[10px] text-slate-500 uppercase font-bold z-10">Activity Trend (Active Tokens)</p>
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={nodeHistory}>
                    <defs>
                       <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                       </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorTokens)" isAnimationActive={false} />
                 </AreaChart>
              </ResponsiveContainer>
           </div>

        </div>
        
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                node.status === 'COMPUTING' 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-slate-700/30 text-slate-400 border-slate-700'
            }`}>
                STATUS: {node.status}
            </span>
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsModal;
